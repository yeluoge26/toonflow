import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { v4 as uuid } from "uuid";

@Injectable()
export class PromptService {
  async getPopulation() {
    const prisma = new (await import("../../database/prisma.service")).PrismaService();
    await prisma.onModuleInit();
    const genomes = await prisma.promptGenome.findMany({
      where: { status: "active" },
      orderBy: { score: "desc" },
    });
    await prisma.$disconnect();
    return genomes;
  }

  async initPopulation(count: number) {
    // Delegate to existing evolution engine
    const evolutionEngine = (await import("../../../lib/evolutionEngine")).default;
    return evolutionEngine.generateInitialPopulation(count);
  }

  async evolve(mutationRate = 0.3) {
    const evolutionEngine = (await import("../../../lib/evolutionEngine")).default;
    const u = (await import("../../../utils")).default;

    const rows = await u.db("t_promptGenome").where("status", "active").select("*");
    const population = rows.map((r: any) => ({
      id: r.promptId,
      generation: r.generation,
      variables: JSON.parse(r.variables || "{}"),
      score: r.score || 0,
      performanceScore: r.performanceScore || 0,
      parentIds: r.parentId ? [r.parentId] : [],
      createdAt: r.createdAt,
    }));

    if (population.length < 10) throw new Error("种群数量不足(至少10个)");

    const nextGen = await evolutionEngine.evolve(population, mutationRate);

    // Deprecate old, save new
    await u.db("t_promptGenome").where("status", "active").update({ status: "deprecated" });
    for (const genome of nextGen) {
      await u.db("t_promptGenome").insert({
        promptId: genome.id,
        template: evolutionEngine.genomeToPrompt(genome),
        variables: JSON.stringify(genome.variables),
        score: genome.score,
        performanceScore: genome.performanceScore,
        generation: genome.generation,
        parentId: genome.parentIds[0] || null,
        status: "active",
        usageCount: 0,
        createdAt: Date.now(),
      }).catch((err: any) => { console.error("[background]", err.message); });
    }

    return { count: nextGen.length, avgGeneration: Math.round(nextGen.reduce((s: number, g: any) => s + g.generation, 0) / nextGen.length * 10) / 10 };
  }
}
