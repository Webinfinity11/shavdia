export const ORDER_STATUSES = [
  { value: "new", label: "ახალი" },
  { value: "processing", label: "მუშავდება" },
  { value: "completed", label: "დასრულებული" },
  { value: "cancelled", label: "გაუქმებული" },
];

export function orderStatusLabel(status: string) {
  return ORDER_STATUSES.find((option) => option.value === status)?.label ?? status;
}
