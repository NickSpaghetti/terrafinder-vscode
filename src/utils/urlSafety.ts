export const isSafeHttpUrl = (source: string): boolean => {
    try {
        const protocol = new URL(source).protocol;
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
};
