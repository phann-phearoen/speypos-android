export interface CompatibilityResult<T> {
  data: T | null;
  error: string | null;
}