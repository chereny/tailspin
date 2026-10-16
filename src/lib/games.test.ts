import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getAllCategories,
    getAllPublishers,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    describe('filtering and lookups', () => {
        let ids: { catA: number; catB: number; catC: number; pubX: number; pubY: number };

        beforeEach(async () => {
            const cats = await db
                .insert(categories)
                .values([{ name: 'Strategy' }, { name: 'Action' }, { name: 'Puzzle' }])
                .returning({ id: categories.id });
            const pubs = await db
                .insert(publishers)
                .values([{ name: 'Zeta Games' }, { name: 'Alpha Works' }])
                .returning({ id: publishers.id });
            ids = {
                catA: cats[0].id,
                catB: cats[1].id,
                catC: cats[2].id,
                pubX: pubs[0].id,
                pubY: pubs[1].id,
            };
            await db.insert(games).values([
                { title: 'One', description: 'd', categoryId: ids.catA, publisherId: ids.pubX },
                { title: 'Two', description: 'd', categoryId: ids.catB, publisherId: ids.pubX },
                { title: 'Three', description: 'd', categoryId: ids.catB, publisherId: ids.pubY },
                { title: 'Four', description: 'd', categoryId: ids.catC, publisherId: ids.pubY },
            ]);
        });

        const titles = async (filters: Parameters<typeof getAllGames>[1]): Promise<string[]> =>
            (await getAllGames(db, filters)).map((g) => g.title);

        it('returns everything for empty filters', async () => {
            expect(await titles({})).toEqual(['Four', 'One', 'Three', 'Two']);
            expect(await titles({ categoryIds: [], publisherIds: [] })).toEqual(['Four', 'One', 'Three', 'Two']);
        });

        it('filters by a single category', async () => {
            expect(await titles({ categoryIds: [ids.catB] })).toEqual(['Three', 'Two']);
        });

        it('filters by multiple categories (OR)', async () => {
            expect(await titles({ categoryIds: [ids.catA, ids.catC] })).toEqual(['Four', 'One']);
        });

        it('filters by publisher', async () => {
            expect(await titles({ publisherIds: [ids.pubY] })).toEqual(['Four', 'Three']);
        });

        it('combines category and publisher filters (AND)', async () => {
            expect(await titles({ categoryIds: [ids.catB], publisherIds: [ids.pubY] })).toEqual(['Three']);
        });

        it('returns nothing when filters do not intersect', async () => {
            expect(await titles({ categoryIds: [ids.catA], publisherIds: [ids.pubY] })).toEqual([]);
        });

        it('lists categories and publishers ordered by name', async () => {
            expect((await getAllCategories(db)).map((c) => c.name)).toEqual(['Action', 'Puzzle', 'Strategy']);
            expect((await getAllPublishers(db)).map((p) => p.name)).toEqual(['Alpha Works', 'Zeta Games']);
        });
    });
});
