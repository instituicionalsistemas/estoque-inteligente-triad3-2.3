
export const getDaysRemaining = (entryDate: string, goalDays: number): number => {
    const entry = new Date(entryDate);
    const deadline = new Date(entry.setDate(entry.getDate() + goalDays));
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

export const getDaysInStock = (entryDate: string, saleDate?: string): number => {
    const entry = new Date(entryDate);
    const end = saleDate ? new Date(saleDate) : new Date();
    const diffTime = end.getTime() - entry.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : 0;
};
