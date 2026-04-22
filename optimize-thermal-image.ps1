param(
    [string]$InputPath = '123-modified.jpg',
    [int]$TargetWidth = 576,
    [int]$JpegQuality = 42,
    [switch]$BlackAndWhite
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-InputPath {
    param([string]$PathValue)

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }

    return [System.IO.Path]::Combine($PSScriptRoot, $PathValue)
}

function Get-JpegCodec {
    return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' } |
        Select-Object -First 1
}

function Save-Jpeg {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$OutputPath,
        [int]$Quality
    )

    $jpegCodec = Get-JpegCodec
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [int64]$Quality)
    $Bitmap.Save($OutputPath, $jpegCodec, $encoderParams)
    $encoderParams.Dispose()
}

function Convert-ToThermalBitmap {
    param(
        [System.Drawing.Bitmap]$SourceBitmap,
        [int]$Width,
        [bool]$UseThreshold
    )

    $ratio = $SourceBitmap.Height / $SourceBitmap.Width
    $height = [Math]::Max(1, [int][Math]::Round($Width * $ratio))

    $targetBitmap = New-Object System.Drawing.Bitmap($Width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Width, $height)
    $graphics.DrawImage($SourceBitmap, $rect, 0, 0, $SourceBitmap.Width, $SourceBitmap.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $contrast = 1.18
    $brightnessOffset = -12

    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $Width; $x++) {
            $pixel = $targetBitmap.GetPixel($x, $y)
            $gray = [int][Math]::Round(($pixel.R * 0.299) + ($pixel.G * 0.587) + ($pixel.B * 0.114))
            $adjusted = [int][Math]::Round((($gray - 128) * $contrast) + 128 + $brightnessOffset)
            $adjusted = [Math]::Max(0, [Math]::Min(255, $adjusted))
            $grayColor = [System.Drawing.Color]::FromArgb($adjusted, $adjusted, $adjusted)
            $targetBitmap.SetPixel($x, $y, $grayColor)
        }
    }

    if (-not $UseThreshold) {
        return $targetBitmap
    }

    $thresholdBitmap = New-Object System.Drawing.Bitmap($Width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $Width; $x++) {
            $pixel = $targetBitmap.GetPixel($x, $y)
            $gray = [int](($pixel.R + $pixel.G + $pixel.B) / 3)
            $tone = if ($gray -lt 168) { 0 } else { 255 }
            $thresholdBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($tone, $tone, $tone))
        }
    }

    $targetBitmap.Dispose()
    return $thresholdBitmap
}

Add-Type -AssemblyName System.Drawing

$resolvedInput = Resolve-InputPath -PathValue $InputPath
if (-not (Test-Path -LiteralPath $resolvedInput)) {
    throw "No se encontro la imagen: $resolvedInput"
}

$sourceBitmap = [System.Drawing.Bitmap]::FromFile($resolvedInput)
try {
    $processedBitmap = Convert-ToThermalBitmap -SourceBitmap $sourceBitmap -Width $TargetWidth -UseThreshold:$BlackAndWhite.IsPresent
    try {
        $inputDirectory = Split-Path -Parent $resolvedInput
        $inputName = [System.IO.Path]::GetFileNameWithoutExtension($resolvedInput)
        $suffix = if ($BlackAndWhite) { 'thermal-88mm-bw' } else { 'thermal-88mm' }
        $outputPath = Join-Path $inputDirectory ($inputName + '-' + $suffix + '.jpg')
        Save-Jpeg -Bitmap $processedBitmap -OutputPath $outputPath -Quality $JpegQuality

        $inputSizeKb = [Math]::Round((Get-Item -LiteralPath $resolvedInput).Length / 1KB, 1)
        $outputSizeKb = [Math]::Round((Get-Item -LiteralPath $outputPath).Length / 1KB, 1)

        Write-Host ''
        Write-Host 'Imagen termica generada:' -ForegroundColor Green
        Write-Host $outputPath
        Write-Host "Tamano original: $inputSizeKb KB"
        Write-Host "Tamano nuevo:    $outputSizeKb KB"
        Write-Host "Ancho final:     $TargetWidth px"
        if ($BlackAndWhite) {
            Write-Host 'Modo:            blanco y negro alto contraste'
        } else {
            Write-Host 'Modo:            escala de grises optimizada'
        }
    } finally {
        $processedBitmap.Dispose()
    }
} finally {
    $sourceBitmap.Dispose()
}