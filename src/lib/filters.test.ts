import { describe, it, expect } from 'vitest';
import { matchesFilters, parseFilters, serializeFilters } from './filters';

describe('filters', () => {
    it('parses repeated category params and a publisher', () => {
        const selection = parseFilters(new URLSearchParams('category=1&category=3&publisher=2'));
        expect(selection).toEqual({ categoryIds: [1, 3], publisherIds: [2] });
    });

    it('ignores invalid and duplicate ids', () => {
        const selection = parseFilters(new URLSearchParams('category=x&category=2&category=2&publisher=-1'));
        expect(selection).toEqual({ categoryIds: [2], publisherIds: [] });
    });

    it('round-trips through serializeFilters', () => {
        const selection = { categoryIds: [1, 2], publisherIds: [4] };
        expect(parseFilters(serializeFilters(selection))).toEqual(selection);
        expect(serializeFilters({ categoryIds: [], publisherIds: [] }).toString()).toBe('');
    });

    it('matches everything when nothing is selected', () => {
        expect(matchesFilters({ categoryId: 1, publisherId: 1 }, { categoryIds: [], publisherIds: [] })).toBe(true);
        expect(matchesFilters({ categoryId: null, publisherId: null }, { categoryIds: [], publisherIds: [] })).toBe(true);
    });

    it('ORs categories and ANDs with publisher', () => {
        const selection = { categoryIds: [1, 2], publisherIds: [5] };
        expect(matchesFilters({ categoryId: 2, publisherId: 5 }, selection)).toBe(true);
        expect(matchesFilters({ categoryId: 3, publisherId: 5 }, selection)).toBe(false);
        expect(matchesFilters({ categoryId: 1, publisherId: 6 }, selection)).toBe(false);
    });

    it('does not match games missing a filtered attribute', () => {
        expect(matchesFilters({ categoryId: null, publisherId: 1 }, { categoryIds: [1], publisherIds: [] })).toBe(false);
    });
});
