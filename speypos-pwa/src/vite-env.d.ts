/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BACKEND_URL?: string;
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_ANDROID_WEBVIEW?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
