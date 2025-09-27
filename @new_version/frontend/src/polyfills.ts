// Polyfills simplificados para fetch y Request
import 'whatwg-fetch';

// Asegurar que las APIs estén disponibles en globalThis
if (typeof globalThis.Request === 'undefined' && typeof window !== 'undefined') {
  (globalThis as any).Request = window.Request;
}

if (typeof globalThis.Response === 'undefined' && typeof window !== 'undefined') {
  (globalThis as any).Response = window.Response;
}

if (typeof globalThis.Headers === 'undefined' && typeof window !== 'undefined') {
  (globalThis as any).Headers = window.Headers;
}

if (typeof globalThis.fetch === 'undefined' && typeof window !== 'undefined') {
  (globalThis as any).fetch = window.fetch;
}

console.log('Polyfills cargados correctamente');
