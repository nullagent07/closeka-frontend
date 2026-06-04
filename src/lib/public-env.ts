export function publicEnv() {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Closeka",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}
