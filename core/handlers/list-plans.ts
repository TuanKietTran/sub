import { createHandler, useMediator } from "../cqrs";
import type { PlanRepository } from "../repos/plan.repo";

export interface ListPlansInput {
   publicOnly?: boolean;
}

export interface ListPlansOutput {
   plans: ReturnType<import("../domain/catalog").Plan["toJSON"]>[];
}

export function createListPlansHandler(repo: PlanRepository) {
   return createHandler<ListPlansInput, ListPlansOutput>(
      "ListPlans",
      async (payload) => {
         const plans =
            payload.publicOnly !== false
               ? await repo.findPublic()
               : await repo.findAll();
         return {
            success: true,
            data: { plans: plans.map((p) => p.toJSON()) },
         };
      },
   );
}

export function listPlansQuery(input: ListPlansInput = {}) {
   return { _type: "query" as const, requestName: "ListPlans", payload: input };
}

export function registerListPlans(repo: PlanRepository) {
   useMediator().registerQuery(createListPlansHandler(repo));
}
