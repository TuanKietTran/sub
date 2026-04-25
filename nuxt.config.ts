// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   compatibilityDate: "2025-07-15",
   devtools: { enabled: true },
   alias: {
      "@core": "../core",
   },

   nitro: {
      alias: {
         "@core": "../core",
      },
      typescript: {
         tsConfig: {
            compilerOptions: {
               paths: {
                  "@core/*": ["../core/*"],
               },
            },
         },
      },
   },
});
