import { useMediator } from "@core/cqrs";
import { listPlansQuery } from "@core/handlers/list-plans";

export default defineEventHandler(async (event) => {
   const { all } = getQuery(event);
   const mediator = useMediator();
   return mediator.send(listPlansQuery({ publicOnly: all !== "true" }));
});
