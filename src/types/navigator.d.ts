// This declaration merges with the global Navigator interface to provide type
// safety for the experimental WebGPU API, preventing TypeScript errors when
// accessing `navigator.gpu`.
declare global {
  interface Navigator {
    gpu?: GPU;
  }
}
// This empty export is required to treat this file as a module.
export {};