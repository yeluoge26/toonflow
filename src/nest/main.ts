import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: "*" });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const port = parseInt(process.env.NEST_PORT || "3000");
  await app.listen(port);
  console.log(`[NestJS] Server running on http://localhost:${port}`);
}

bootstrap();
