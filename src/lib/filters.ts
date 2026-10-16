/** Selected filter ids, as used by the listing page's client-side filtering. */
export interface FilterSelection {
    categoryIds: number[];
    publisherIds: number[];
}

/** The identifiers a game card exposes for filtering. */
export interface FilterableGame {
    categoryId: number | null;
    publisherId: number | null;
}

/**
 * Converts raw query values to unique positive integer ids, dropping invalid entries.
 * @param values - Raw query-string values.
 * @returns Unique valid ids in first-seen order.
 */
function parseIds(values: string[]): number[] {
    const ids = values.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    return [...new Set(ids)];
}

/**
 * Reads the repeatable `category` and `publisher` query params into a selection.
 * @param params - The URL search params to read.
 * @returns The parsed filter selection.
 */
export function parseFilters(params: URLSearchParams): FilterSelection {
    return {
        categoryIds: parseIds(params.getAll('category')),
        publisherIds: parseIds(params.getAll('publisher')),
    };
}

/**
 * Serializes a selection back into query params (inverse of {@link parseFilters}).
 * @param selection - The filter selection to serialize.
 * @returns Search params; empty when nothing is selected.
 */
export function serializeFilters(selection: FilterSelection): URLSearchParams {
    const params = new URLSearchParams();
    for (const id of selection.categoryIds) params.append('category', String(id));
    for (const id of selection.publisherIds) params.append('publisher', String(id));
    return params;
}

/**
 * Tests whether a game passes the selection: categories are OR'd, publishers are OR'd,
 * and the two groups are AND'd. An empty group matches everything.
 * @param game - The game's category and publisher ids.
 * @param selection - The active filter selection.
 * @returns `true` when the game should be shown.
 */
export function matchesFilters(game: FilterableGame, selection: FilterSelection): boolean {
    const categoryOk =
        selection.categoryIds.length === 0 ||
        (game.categoryId !== null && selection.categoryIds.includes(game.categoryId));
    const publisherOk =
        selection.publisherIds.length === 0 ||
        (game.publisherId !== null && selection.publisherIds.includes(game.publisherId));
    return categoryOk && publisherOk;
}
