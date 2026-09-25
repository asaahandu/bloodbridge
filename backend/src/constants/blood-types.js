export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Hospital requests must always target a known blood type, while a donor may
// create an account before they have had their blood type confirmed.
export const DONOR_BLOOD_TYPES = [...BLOOD_TYPES, 'unknown'];
