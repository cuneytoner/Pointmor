import { buildApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;

const app = await buildApp();
const address = await app.listen({ port, host: "0.0.0.0" });
app.log.info(`API listening at ${address}`);
