import { INTAKE_CATEGORY_LABELS, INTAKE_CATEGORIES, INTAKE_SERVICE_LABELS, STORAGE_LABELS, DECLARED_HAZMAT_STATUS_LABELS, HAZARD_TYPE_LABELS, SDS_STATUS_LABELS, HAZARD_CLASS_LABELS, PACKING_GROUP_LABELS, BATTERY_TYPE_LABELS, BATTERY_CONFIGURATION_LABELS, BATTERY_UN383_STATUS_LABELS, PHYSICAL_STATE_LABELS, LEAKAGE_DAMAGE_RISK_LABELS, AMAZON_FULFILMENT_CHANNEL_LABELS, AMAZON_LISTING_STATUS_LABELS, AMAZON_DG_REVIEW_STATUS_LABELS, AMAZON_COMPLIANCE_DOCS_LABELS } from '../constants/intake.js';

export { INTAKE_CATEGORY_LABELS, INTAKE_CATEGORIES, INTAKE_SERVICE_LABELS, STORAGE_LABELS, DECLARED_HAZMAT_STATUS_LABELS, HAZARD_TYPE_LABELS, SDS_STATUS_LABELS, HAZARD_CLASS_LABELS, PACKING_GROUP_LABELS, BATTERY_TYPE_LABELS, BATTERY_CONFIGURATION_LABELS, BATTERY_UN383_STATUS_LABELS, PHYSICAL_STATE_LABELS, LEAKAGE_DAMAGE_RISK_LABELS, AMAZON_FULFILMENT_CHANNEL_LABELS, AMAZON_LISTING_STATUS_LABELS, AMAZON_DG_REVIEW_STATUS_LABELS, AMAZON_COMPLIANCE_DOCS_LABELS };

export const SERVICE_LABELS = Object.freeze({
  'inventory-receiving': 'Inventory receiving',
  'warehousing-storage': 'Warehousing and storage',
  'inventory-management': 'Inventory management',
  'order-fulfillment': 'Order fulfilment',
  'packaging-labeling': 'Packaging and labelling',
  'courier-dispatch': 'Courier dispatch',
  'returns-handling': 'Returns handling'
});

export function getServiceLabels(services = []) {
  return services.map((service) => SERVICE_LABELS[service] || String(service));
}

export function getIntakeCategoryLabel(category) {
  return INTAKE_CATEGORY_LABELS[category] || String(category || 'Other');
}

export function getIntakeServiceLabels(services = []) {
  return services.map((service) => INTAKE_SERVICE_LABELS[service] || String(service));
}
