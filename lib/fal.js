import * as fal from "@fal-ai/serverless-client";

fal.config({
  proxyUrl: "/api/fal/proxy",
});

export { fal };