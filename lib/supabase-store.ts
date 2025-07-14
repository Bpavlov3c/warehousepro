/* -------------------------------------------------------------------------- */
/*                           Public export signature                          */
/* -------------------------------------------------------------------------- */

export const supabaseStore = {
  /* Inventory */
  getInventory: () => Promise.resolve([]),
  addManualInventory: () => Promise.resolve({}),

  /* Purchase Orders */
  getPurchaseOrders: () => Promise.resolve([]),
  createPurchaseOrder: () => Promise.resolve({}),
  updatePurchaseOrder: () => Promise.resolve({}),
  updatePurchaseOrderWithItems: () => Promise.resolve({}),

  /* Shopify Stores */
  getShopifyStores: () => Promise.resolve([]),
  addShopifyStore: () => Promise.resolve({}),
  updateShopifyStore: () => Promise.resolve({}),
  deleteShopifyStore: () => Promise.resolve({}),

  /* Shopify Orders */
  getShopifyOrders: () => Promise.resolve([]),
  addShopifyOrders: () => Promise.resolve({}),

  /* Returns */
  getReturns: () => Promise.resolve([]),
  createReturn: () => Promise.resolve({}),
  updateReturn: () => Promise.resolve({}),

  /* Minimal stubs so other pages keep compiling */
  getStores: () => Promise.resolve([]),
  getReports: () => Promise.resolve([]),
}
