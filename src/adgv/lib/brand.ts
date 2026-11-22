// Brand of the client dashboard (the Abu Dhabi Golden Visa dashboard design, run for Golden Visa UAE).
export const DEFAULT_BRAND: string = 'Abu Dhabi Golden Visa';
export const BRAND_NAME: string = 'Golden Visa UAE';
export const BRAND_CODE = 'GV';
export const BRAND_PX = 'gv';
export const BRAND_DIR = '/brand';
export const brandText = (s: string) => s.split(DEFAULT_BRAND).join(BRAND_NAME);
