# 📦 Sistema de Inventario Dinámico con Firebase

## ✨ Características

- **Firebase Firestore**: Almacenamiento en tiempo real en la nube
- **Sincronización Automática**: Cambios reflejados instantáneamente en todos los dispositivos
- **Integrado con ingredientes.html**: Lee los ingredientes reales del catálogo
- **Sistema de Recetas**: Define qué ingredientes consume cada producto
- **Validación Inteligente**: Verifica stock antes de permitir ventas
- **Historial de Actividad**: Log completo en Firebase con timestamps
- **Dashboard en Tiempo Real**: Métricas actualizadas automáticamente
- **Sincronización Manual**: Botón para agregar nuevos ingredientes del catálogo

## 🔗 Integración con Ingredientes

El sistema de inventario ahora está **completamente integrado** con [ingredientes.html](ingredientes.html):

1. **Carga Automática**: Al inicializar, lee todos los ingredientes desde Firebase Settings (`ingredientsCatalog`)
2. **Stock Inteligente**: Crea estructura de stock con cantidades iniciales basadas en `unidadesPaquete`
3. **Sincronización Manual**: Botón "Sincronizar" para agregar nuevos ingredientes agregados en ingredientes.html
4. **No Duplicados**: El merge de ingredientes usa el nombre normalizado como key única

### Flujo de Trabajo

```
ingredientes.html → Firebase Settings → inventario.html
                    (ingredientsCatalog)
```

1. **Agrega ingredientes** en [ingredientes.html](ingredientes.html)
2. **Se guardan** en Firebase Settings bajo `ingredientsCatalog`
3. **inventario.html lee** ese catálogo al inicializar
4. **Crea stock** con cantidad inicial = `unidadesPaquete × 2`
5. **Calcula mínimo** automáticamente (20% de cantidad inicial)

## 🔥 Estructura de Firebase

### Colecciones Firestore

```
sr-sra-burger/
├── inventario/
│   ├── stock (documento único)
│   │   ├── items: { pan: { cantidad, unidad, minimo }, ... }
│   │   └── lastUpdated: timestamp
│   └── sales_stats (documento único)
│       ├── "Sun Feb 02 2026": 15
│       └── "Mon Feb 03 2026": 23
├── inventario_logs/ (colección)
│   ├── log1 { message, type, timestamp }
│   ├── log2 { message, type, timestamp }
│   └── ...
```

## 🚀 Uso desde otras páginas

### Opción 1: Importar módulo Firebase

```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
  import { getFirestore, doc, getDoc, setDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

  const firebaseConfig = {
    apiKey: "AIzaSyCf7-6oLHjpNgU1zr4qdTrOKuXGe1ht2Zs",
    authDomain: "sr-sra-burger.firebaseapp.com",
    projectId: "sr-sra-burger",
    storageBucket: "sr-sra-burger.firebasestorage.app",
    messagingSenderId: "542059080203",
    appId: "1:542059080203:web:2e15f179a1475b1a77f50e"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Definir recetas (copiar desde inventario.html)
  const RECETAS = {
    hamburguesa_sencilla: {
      nombre: 'Hamburguesa Sencilla',
      ingredientes: {
        pan: 1,
        carne: 1,
        lechuga: 20,
        jitomate: 15,
        queso: 1,
        cebolla: 10
      }
    },
    // ... más recetas
  };

  // Función para registrar venta
  async function registrarVenta(producto) {
    const receta = RECETAS[producto];
    if (!receta) {
      console.error('Producto no encontrado en recetas');
      return false;
    }

    try {
      const docRef = doc(db, 'inventario', 'stock');
      
      // Usar transacción para evitar condiciones de carrera
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        
        if (!docSnap.exists()) {
          throw new Error('Inventario no inicializado');
        }

        const inventario = docSnap.data().items;
        const faltantes = [];

        // Verificar stock
        for (const [ingrediente, cantidad] of Object.entries(receta.ingredientes)) {
          if (!inventario[ingrediente]) {
            faltantes.push(`${ingrediente} (no existe)`);
          } else if (inventario[ingrediente].cantidad < cantidad) {
            faltantes.push(`${ingrediente} (necesitas ${cantidad}, tienes ${inventario[ingrediente].cantidad})`);
          }
        }

        if (faltantes.length > 0) {
          throw new Error(`Stock insuficiente: ${faltantes.join(', ')}`);
        }

        // Descontar ingredientes
        for (const [ingrediente, cantidad] of Object.entries(receta.ingredientes)) {
          inventario[ingrediente].cantidad -= cantidad;
        }

        // Guardar cambios
        transaction.set(docRef, {
          items: inventario,
          lastUpdated: new Date()
        });
      });

      console.log(`✅ Venta registrada: ${receta.nombre}`);
      return true;

    } catch (error) {
      console.error('❌ Error al registrar venta:', error);
      alert(error.message);
      return false;
    }
  }

  // Ejemplo de uso al hacer clic en un botón
  document.getElementById('btn-vender-hamburguesa').addEventListener('click', async () => {
    const exito = await registrarVenta('hamburguesa_sencilla');
    if (exito) {
      alert('Venta realizada con éxito!');
    }
  });
</script>
```

### Opción 2: Usar desde iframe o window.postMessage

Si tienes inventario.html abierto en un iframe o popup:

```javascript
// Desde la página principal
const ventanaInventario = window.open('inventario.html');

// Esperar a que cargue
ventanaInventario.addEventListener('load', () => {
  // Llamar función global
  ventanaInventario.registrarVenta('hamburguesa_sencilla').then(exito => {
    console.log('Venta registrada:', exito);
  });
});
```

### Opción 3: API Compartida (Recomendado)

Crear un archivo `js/inventario-api.js`:

```javascript
// js/inventario-api.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCf7-6oLHjpNgU1zr4qdTrOKuXGe1ht2Zs",
  authDomain: "sr-sra-burger.firebaseapp.com",
  projectId: "sr-sra-burger",
  storageBucket: "sr-sra-burger.firebasestorage.app",
  messagingSenderId: "542059080203",
  appId: "1:542059080203:web:2e15f179a1475b1a77f50e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const RECETAS = {
  hamburguesa_sencilla: {
    nombre: 'Hamburguesa Sencilla',
    ingredientes: { pan: 1, carne: 1, lechuga: 20, jitomate: 15, queso: 1, cebolla: 10 }
  },
  hamburguesa_doble: {
    nombre: 'Hamburguesa Doble',
    ingredientes: { pan: 1, carne: 2, lechuga: 25, jitomate: 20, queso: 2, cebolla: 15, tocino: 2 }
  },
  boneless: {
    nombre: 'Boneless (10 pzas)',
    ingredientes: { pollo: 250, harina: 50, aceite: 100 }
  },
  papas: {
    nombre: 'Papas Fritas',
    ingredientes: { papa: 200, aceite: 50, sal: 5 }
  }
};

export async function registrarVenta(producto) {
  const receta = RECETAS[producto];
  if (!receta) {
    throw new Error('Producto no encontrado en recetas');
  }

  const docRef = doc(db, 'inventario', 'stock');

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Inventario no inicializado');
    }

    const inventario = docSnap.data().items;
    const faltantes = [];

    // Verificar stock
    for (const [ingrediente, cantidad] of Object.entries(receta.ingredientes)) {
      if (!inventario[ingrediente]) {
        faltantes.push(`${ingrediente} (no existe)`);
      } else if (inventario[ingrediente].cantidad < cantidad) {
        faltantes.push(`${ingrediente} (necesitas ${cantidad}, tienes ${inventario[ingrediente].cantidad})`);
      }
    }

    if (faltantes.length > 0) {
      throw new Error(`Stock insuficiente: ${faltantes.join(', ')}`);
    }

    // Descontar ingredientes
    for (const [ingrediente, cantidad] of Object.entries(receta.ingredientes)) {
      inventario[ingrediente].cantidad -= cantidad;
    }

    transaction.set(docRef, {
      items: inventario,
      lastUpdated: serverTimestamp()
    });
  });

  return true;
}
```

Luego usar en cualquier página:

```html
<script type="module">
  import { registrarVenta } from './js/inventario-api.js';

  document.getElementById('btn-vender').addEventListener('click', async () => {
    try {
      await registrarVenta('hamburguesa_sencilla');
      alert('✅ Venta registrada con éxito!');
    } catch (error) {
      alert('❌ ' + error.message);
    }
  });
</script>
```

## 📋 Recetas Disponibles

| Producto | Ingredientes |
|----------|-------------|
| `hamburguesa_sencilla` | pan (1), carne (1), lechuga (20g), jitomate (15g), queso (1), cebolla (10g) |
| `hamburguesa_doble` | pan (1), carne (2), lechuga (25g), jitomate (20g), queso (2), cebolla (15g), tocino (2) |
| `boneless` | pollo (250g), harina (50g), aceite (100ml) |
| `papas` | papa (200g), aceite (50ml), sal (5g) |

## 🔧 Agregar Nuevos Ingredientes y Productos

### Método 1: Desde ingredientes.html (Recomendado)

1. **Abre** [ingredientes.html](ingredientes.html)
2. **Completa el formulario**:
   - Nombre: Salchicha Jumbo
   - Unidad: unidad
   - Precio por paquete: 178
   - Unidades por paquete: 20
3. **Guarda** - Se sincroniza automáticamente con Firebase
4. **Abre** [inventario.html](inventario.html)
5. **Haz clic** en botón "Sincronizar" (navbar)
6. ✅ El ingrediente aparece con stock inicial automático

### Método 2: Definir Receta de Producto

Edita `RECETAS` en [inventario.html](inventario.html):

```javascript
const RECETAS = {
  // ... recetas existentes
  
  hot_dog_jumbo: {
    nombre: 'Hot Dog Jumbo',
    ingredientes: {
      salchicha_jumbo: 1,  // ← Key normalizado (minúsculas, sin espacios)
      pan_hotdog: 1,
      catsup: 30,
      mostaza: 20
    }
  }
};
```

**Reglas de Normalización**:
- "Salchicha Jumbo" → `salchicha_jumbo`
- Espacios → guiones bajos (`_`)
- Todo en minúsculas

### Cálculo Automático de Stock

| Unidad | Stock Mínimo Calculado |
|--------|------------------------|
| g, grs | Max(100, 15% cantidad) |
| kg | Max(1, 20% cantidad) |
| ml | Max(100, 15% cantidad) |
| L | Max(1, 20% cantidad) |
| unidad, pz, u | Max(5, 20% cantidad) |

Ejemplo:
- Pan Hotdog: 12 unidades/paquete
- Stock inicial: 24 (2 paquetes)
- Mínimo: 5 (20% de 24)

## 🎯 Casos de Uso

### 1. Página de Cliente (cliente.html)

Al finalizar pedido:

```javascript
async function finalizarPedido(carrito) {
  for (const item of carrito) {
    const productoKey = item.nombre.toLowerCase().replace(/ /g, '_');
    try {
      await registrarVenta(productoKey);
    } catch (error) {
      alert(`⚠️ ${error.message}`);
      return false;
    }
  }
  return true;
}
```

### 2. Página de Administración (admin.html)

Venta manual:

```javascript
async function ventaManual(producto) {
  try {
    await registrarVenta(producto);
    showNotification('Venta registrada', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}
```

### 3. Control de Envíos (controldeenvios.html)

Al marcar pedido como entregado:

```javascript
async function marcarComoEntregado(pedidoId, productos) {
  // ... lógica de entrega
  
  for (const producto of productos) {
    await registrarVenta(producto.id);
  }
  
  // ... actualizar estado
}
```

## 📊 Monitoreo de Stock

### Obtener estado actual del inventario:

```javascript
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

async function obtenerInventario() {
  const docRef = doc(db, 'inventario', 'stock');
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data().items;
  }
  return null;
}

// Uso
const inventario = await obtenerInventario();
console.log('Pan restante:', inventario.pan.cantidad);
```

### Escuchar cambios en tiempo real:

```javascript
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const unsubscribe = onSnapshot(doc(db, 'inventario', 'stock'), (doc) => {
  const inventario = doc.data().items;
  
  // Verificar productos con stock bajo
  for (const [nombre, data] of Object.entries(inventario)) {
    if (data.cantidad <= data.minimo) {
      console.warn(`⚠️ Stock bajo: ${nombre}`);
      // Enviar notificación, email, etc.
    }
  }
});
```

## 🔐 Seguridad (Firestore Rules)

Agregar en Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Inventario: solo lectura para todos, escritura autenticada
    match /inventario/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Logs: solo escritura autenticada
    match /inventario_logs/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

## 🚨 Manejo de Errores

```javascript
try {
  await registrarVenta('hamburguesa_sencilla');
  console.log('✅ Venta exitosa');
} catch (error) {
  if (error.message.includes('Stock insuficiente')) {
    // Mostrar alerta específica de stock
    alert('⚠️ No hay suficientes ingredientes');
  } else if (error.message.includes('no existe')) {
    // Producto no encontrado
    alert('❌ Producto no válido');
  } else {
    // Error de conexión u otro
    console.error('Error:', error);
    alert('🔌 Error de conexión con Firebase');
  }
}
```

## 📱 Offline Support

Firebase SDK incluye caché automático:

```javascript
import { enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Habilitar persistencia offline
try {
  await enableIndexedDbPersistence(db);
  console.log('✅ Modo offline habilitado');
} catch (error) {
  if (error.code === 'failed-precondition') {
    console.warn('Múltiples tabs abiertos, persistencia deshabilitada');
  } else if (error.code === 'unimplemented') {
    console.warn('Navegador no soporta persistencia');
  }
}
```

## 🎨 Integración con UI

Ejemplo de componente React-style:

```javascript
class InventarioWidget extends HTMLElement {
  connectedCallback() {
    this.render();
    this.subscribirACambios();
  }

  async subscribirACambios() {
    const docRef = doc(db, 'inventario', 'stock');
    
    onSnapshot(docRef, (snapshot) => {
      const inventario = snapshot.data().items;
      this.actualizarUI(inventario);
    });
  }

  actualizarUI(inventario) {
    const stockBajo = Object.entries(inventario)
      .filter(([_, data]) => data.cantidad <= data.minimo);
    
    this.innerHTML = `
      <div class="inventario-widget">
        <h3>Stock Bajo (${stockBajo.length})</h3>
        <ul>
          ${stockBajo.map(([nombre, data]) => `
            <li>${nombre}: ${data.cantidad} ${data.unidad}</li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  render() {
    this.innerHTML = '<div>Cargando inventario...</div>';
  }
}

customElements.define('inventario-widget', InventarioWidget);
```

Uso:

```html
<inventario-widget></inventario-widget>
```

## 📞 Soporte

Para problemas o preguntas, contactar al administrador del sistema.

---

**Última actualización**: 2 de febrero de 2026  
**Versión**: 1.0.0 con Firebase Firestore  
**Estado**: ✅ Producción
