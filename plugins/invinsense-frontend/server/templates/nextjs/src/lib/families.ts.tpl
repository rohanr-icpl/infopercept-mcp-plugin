/* In production the apps navigator is the shared package fed by the entitlements API (Law 13). */
export const PRODUCT = { id: "__ID__", name: "__PRODUCT_NAME__", family: "__FAMILY_ID__", multiTenant: __MULTI_TENANT__ } as const;

export const FAMILIES: { id: string; name: string; products: string[] }[] = __FAMILIES_JSON__;
