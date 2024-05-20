import { defineNuxtModule } from "@nuxt/kit";
import { consola } from "./utils";
import { collectBuildCache, restoreBuildCache } from "./cache";
import { provider, type ProviderName } from "std-env";

const cacheDirs: Partial<Record<ProviderName, string>> & { default: string } = {
  default: "node_modules/.cache/nuxt/builds",
  cloudflare_pages: ".next/cache/nuxt",
};

export default defineNuxtModule({
  meta: {
    name: "build-cache",
    configKey: "build-cache",
  },
  defaults: {
    cacheDir: cacheDirs[provider] || cacheDirs.default,
  },
  async setup(options, nuxt) {
    if (
      nuxt.options._prepare ||
      nuxt.options.dev ||
      process.env.NUXT_DISABLE_BUILD_CACHE
    ) {
      return;
    }

    // Setup hooks
    nuxt.hook("build:before", async () => {
      // Try to restore
      const restored = process.env.NUXT_IGNORE_BUILD_CACHE
        ? undefined
        : await restoreBuildCache(nuxt, options);
      if (restored) {
        // Skip build since it's restored
        nuxt.options.builder = {
          bundle() {
            consola.info("skipping build");
            return Promise.resolve();
          },
        };
      } else {
        // Collect build cache this time
        if (!process.env.SKIP_NUXT_BUILD_CACHE_COLLECT) {
          nuxt.hook("close", async () => {
            await collectBuildCache(nuxt, options);
          });
        }
      }
    });
  },
});
