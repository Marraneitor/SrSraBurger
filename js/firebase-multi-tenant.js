/**
 * =============================================
 * FIREBASE MULTI-TENANT HELPER
 * =============================================
 * 
 * Este módulo proporciona funciones para trabajar con Firebase
 * en modo multi-tenant, donde múltiples restaurantes comparten
 * la misma base de datos pero los datos están separados por ID.
 * 
 * IMPORTANTE: Este archivo debe importarse DESPUÉS de la
 * inicialización de Firebase y la carga de business-config.js
 */

import { getRestaurantId } from './config-loader.js';

/**
 * Obtener la ruta base para este restaurante en Firestore
 * @returns {string} - Ruta base del restaurante
 */
export function getRestaurantBasePath() {
  const restaurantId = getRestaurantId();
  return `restaurants/${restaurantId}`;
}

/**
 * Obtener referencia a una colección del restaurante
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección (products, orders, customers, etc.)
 * @returns {CollectionReference}
 * 
 * @example
 * const productsRef = getRestaurantCollection(db, 'products');
 * const ordersRef = getRestaurantCollection(db, 'orders');
 */
export function getRestaurantCollection(db, collectionName) {
  if (!db || !db.collection) {
    throw new Error('DB de Firestore no inicializada');
  }
  
  const basePath = getRestaurantBasePath();
  const fullPath = `${basePath}/${collectionName}`;
  
  console.log(`📂 Accediendo a colección: ${fullPath}`);
  return db.collection(fullPath);
}

/**
 * Obtener referencia a un documento del restaurante
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} documentId - ID del documento
 * @returns {DocumentReference}
 * 
 * @example
 * const orderRef = getRestaurantDocument(db, 'orders', 'order-123');
 */
export function getRestaurantDocument(db, collectionName, documentId) {
  if (!db || !db.collection) {
    throw new Error('DB de Firestore no inicializada');
  }
  
  const basePath = getRestaurantBasePath();
  const fullPath = `${basePath}/${collectionName}`;
  
  return db.collection(fullPath).doc(documentId);
}

/**
 * Crear un nuevo documento en una colección del restaurante
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Object} data - Datos del documento
 * @returns {Promise<DocumentReference>}
 * 
 * @example
 * await addRestaurantDocument(db, 'orders', orderData);
 */
export async function addRestaurantDocument(db, collectionName, data) {
  const collection = getRestaurantCollection(db, collectionName);
  
  // Agregar metadata automáticamente
  const docData = {
    ...data,
    restaurantId: getRestaurantId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log(`➕ Creando documento en ${collectionName}:`, docData);
  return await collection.add(docData);
}

/**
 * Actualizar un documento existente
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} documentId - ID del documento
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<void>}
 * 
 * @example
 * await updateRestaurantDocument(db, 'orders', 'order-123', { status: 'completed' });
 */
export async function updateRestaurantDocument(db, collectionName, documentId, data) {
  const docRef = getRestaurantDocument(db, collectionName, documentId);
  
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  
  console.log(`✏️ Actualizando documento ${documentId} en ${collectionName}`);
  return await docRef.update(updateData);
}

/**
 * Eliminar un documento
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} documentId - ID del documento
 * @returns {Promise<void>}
 * 
 * @example
 * await deleteRestaurantDocument(db, 'orders', 'order-123');
 */
export async function deleteRestaurantDocument(db, collectionName, documentId) {
  const docRef = getRestaurantDocument(db, collectionName, documentId);
  
  console.log(`🗑️ Eliminando documento ${documentId} de ${collectionName}`);
  return await docRef.delete();
}

/**
 * Obtener un documento por ID
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} documentId - ID del documento
 * @returns {Promise<Object|null>}
 * 
 * @example
 * const order = await getRestaurantDocumentData(db, 'orders', 'order-123');
 */
export async function getRestaurantDocumentData(db, collectionName, documentId) {
  const docRef = getRestaurantDocument(db, collectionName, documentId);
  const snapshot = await docRef.get();
  
  if (!snapshot.exists) {
    console.warn(`⚠️ Documento ${documentId} no encontrado en ${collectionName}`);
    return null;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

/**
 * Obtener todos los documentos de una colección
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Object} options - Opciones de consulta (orderBy, limit, where)
 * @returns {Promise<Array>}
 * 
 * @example
 * const products = await getAllRestaurantDocuments(db, 'products');
 * const activeProducts = await getAllRestaurantDocuments(db, 'products', {
 *   where: [['active', '==', true]],
 *   orderBy: ['name', 'asc'],
 *   limit: 50
 * });
 */
export async function getAllRestaurantDocuments(db, collectionName, options = {}) {
  let query = getRestaurantCollection(db, collectionName);
  
  // Aplicar filtros where
  if (options.where && Array.isArray(options.where)) {
    options.where.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
  }
  
  // Aplicar orderBy
  if (options.orderBy) {
    if (Array.isArray(options.orderBy)) {
      query = query.orderBy(...options.orderBy);
    } else {
      query = query.orderBy(options.orderBy);
    }
  }
  
  // Aplicar limit
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  console.log(`📖 Obteniendo documentos de ${collectionName}`);
  const snapshot = await query.get();
  
  const documents = [];
  snapshot.forEach(doc => {
    documents.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log(`✅ Obtenidos ${documents.length} documentos de ${collectionName}`);
  return documents;
}

/**
 * Buscar documentos con múltiples criterios
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Array} filters - Array de filtros [field, operator, value]
 * @returns {Promise<Array>}
 * 
 * @example
 * const results = await searchRestaurantDocuments(db, 'products', [
 *   ['category', '==', 'hamburguesas'],
 *   ['price', '<=', 100]
 * ]);
 */
export async function searchRestaurantDocuments(db, collectionName, filters) {
  return await getAllRestaurantDocuments(db, collectionName, { where: filters });
}

/**
 * Escuchar cambios en tiempo real en una colección
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {Function} callback - Función a llamar cuando hay cambios
 * @param {Object} options - Opciones de consulta
 * @returns {Function} - Función para desuscribirse
 * 
 * @example
 * const unsubscribe = listenToCollection(db, 'orders', (orders) => {
 *   console.log('Pedidos actualizados:', orders);
 * });
 * 
 * // Para dejar de escuchar:
 * unsubscribe();
 */
export function listenToCollection(db, collectionName, callback, options = {}) {
  let query = getRestaurantCollection(db, collectionName);
  
  // Aplicar opciones similares a getAllRestaurantDocuments
  if (options.where) {
    options.where.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
  }
  
  if (options.orderBy) {
    if (Array.isArray(options.orderBy)) {
      query = query.orderBy(...options.orderBy);
    } else {
      query = query.orderBy(options.orderBy);
    }
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  console.log(`👂 Escuchando cambios en ${collectionName}`);
  
  const unsubscribe = query.onSnapshot(
    (snapshot) => {
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(documents);
    },
    (error) => {
      console.error(`❌ Error escuchando ${collectionName}:`, error);
    }
  );
  
  return unsubscribe;
}

/**
 * Escuchar cambios en un documento específico
 * @param {Object} db - Instancia de Firestore
 * @param {string} collectionName - Nombre de la colección
 * @param {string} documentId - ID del documento
 * @param {Function} callback - Función a llamar cuando hay cambios
 * @returns {Function} - Función para desuscribirse
 * 
 * @example
 * const unsubscribe = listenToDocument(db, 'orders', 'order-123', (order) => {
 *   console.log('Pedido actualizado:', order);
 * });
 */
export function listenToDocument(db, collectionName, documentId, callback) {
  const docRef = getRestaurantDocument(db, collectionName, documentId);
  
  console.log(`👂 Escuchando cambios en documento ${documentId} de ${collectionName}`);
  
  const unsubscribe = docRef.onSnapshot(
    (doc) => {
      if (doc.exists) {
        callback({
          id: doc.id,
          ...doc.data()
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`❌ Error escuchando documento ${documentId}:`, error);
    }
  );
  
  return unsubscribe;
}

/**
 * Migrar datos existentes a la nueva estructura multi-tenant
 * 
 * IMPORTANTE: Solo ejecutar una vez para migrar datos existentes
 * 
 * @param {Object} db - Instancia de Firestore
 * @param {string} oldCollectionName - Nombre de la colección antigua
 * @param {string} newCollectionName - Nombre de la colección nueva (puede ser el mismo)
 * @returns {Promise<Object>} - Resultado de la migración
 * 
 * @example
 * const result = await migrateToMultiTenant(db, 'products', 'products');
 * console.log(`Migrados ${result.migrated} documentos`);
 */
export async function migrateToMultiTenant(db, oldCollectionName, newCollectionName) {
  console.log(`🔄 Iniciando migración de ${oldCollectionName} a estructura multi-tenant...`);
  
  try {
    // Obtener todos los documentos de la colección antigua
    const oldCollectionRef = db.collection(oldCollectionName);
    const snapshot = await oldCollectionRef.get();
    
    const restaurantId = getRestaurantId();
    const newCollectionPath = `restaurants/${restaurantId}/${newCollectionName}`;
    const newCollectionRef = db.collection(newCollectionPath);
    
    let migrated = 0;
    let errors = 0;
    
    // Batch write para optimizar
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      try {
        const data = doc.data();
        const newDocRef = newCollectionRef.doc(doc.id);
        
        // Agregar metadata
        batch.set(newDocRef, {
          ...data,
          restaurantId: restaurantId,
          migratedAt: new Date().toISOString(),
          migratedFrom: oldCollectionName
        });
        
        migrated++;
      } catch (error) {
        console.error(`Error migrando documento ${doc.id}:`, error);
        errors++;
      }
    });
    
    // Ejecutar el batch
    await batch.commit();
    
    console.log(`✅ Migración completada: ${migrated} documentos migrados, ${errors} errores`);
    
    return {
      success: true,
      migrated,
      errors,
      message: `Migrados ${migrated} documentos de ${oldCollectionName} a ${newCollectionPath}`
    };
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    return {
      success: false,
      migrated: 0,
      errors: 1,
      message: error.message
    };
  }
}

/**
 * Verificar si la estructura multi-tenant existe
 * @param {Object} db - Instancia de Firestore
 * @returns {Promise<boolean>}
 */
export async function checkMultiTenantStructure(db) {
  try {
    const restaurantId = getRestaurantId();
    const basePath = `restaurants/${restaurantId}`;
    const testRef = db.collection(basePath).limit(1);
    const snapshot = await testRef.get();
    
    const exists = !snapshot.empty;
    console.log(exists 
      ? `✅ Estructura multi-tenant existe para ${restaurantId}`
      : `⚠️ Estructura multi-tenant no encontrada para ${restaurantId}`
    );
    
    return exists;
  } catch (error) {
    console.error('Error verificando estructura:', error);
    return false;
  }
}

// Exponer funciones globalmente
if (typeof window !== 'undefined') {
  window.FirebaseMultiTenant = {
    getRestaurantBasePath,
    getRestaurantCollection,
    getRestaurantDocument,
    addRestaurantDocument,
    updateRestaurantDocument,
    deleteRestaurantDocument,
    getRestaurantDocumentData,
    getAllRestaurantDocuments,
    searchRestaurantDocuments,
    listenToCollection,
    listenToDocument,
    migrateToMultiTenant,
    checkMultiTenantStructure
  };
  
  console.log('🔥 Firebase Multi-Tenant Helper cargado');
}

export default {
  getRestaurantBasePath,
  getRestaurantCollection,
  getRestaurantDocument,
  addRestaurantDocument,
  updateRestaurantDocument,
  deleteRestaurantDocument,
  getRestaurantDocumentData,
  getAllRestaurantDocuments,
  searchRestaurantDocuments,
  listenToCollection,
  listenToDocument,
  migrateToMultiTenant,
  checkMultiTenantStructure
};
