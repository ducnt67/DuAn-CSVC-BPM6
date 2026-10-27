export function updateRepairPlanInList(plans, id, updates) {
  return plans.map((plan) =>
    plan.id === id ? { ...plan, ...updates } : plan
  );
}

export function addRepairPlanToList(plans, plan) {
  return [plan, ...plans];
}
