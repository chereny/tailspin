import { test, expect } from '@playwright/test';

test.describe('Game Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Filters - category filter shows only matching games', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"]:visible');
    const total = await cards.count();

    await test.step('Select the Puzzle category', async () => {
      await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    });

    await test.step('Verify only Puzzle games remain', async () => {
      await expect(cards).toHaveCount(4);
      await expect(cards.getByTestId('game-category')).toHaveText(Array(4).fill('Puzzle'));
      await expect(page.getByTestId('filter-result-count')).toHaveText(`Showing 4 of ${total} games`);
      await expect(page).toHaveURL(/\?category=\d+$/);
    });
  });

  test('Filters - multiple categories are combined', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    await page.getByRole('checkbox', { name: 'Action' }).check();
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(9);
  });

  test('Filters - publisher filter shows only matching games', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Publisher' }).selectOption({ label: 'CodeForge Studios' });
    const cards = page.locator('[data-testid="game-card"]:visible');
    await expect(cards).toHaveCount(6);
    await expect(cards.getByTestId('game-publisher')).toHaveText(Array(6).fill('CodeForge Studios'));
  });

  test('Filters - category and publisher can be combined', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await page.getByRole('combobox', { name: 'Publisher' }).selectOption({ label: 'GitHub Games' });
    const cards = page.locator('[data-testid="game-card"]:visible');
    await expect(cards).not.toHaveCount(0);
    await expect(cards.getByTestId('game-category').first()).toHaveText('Strategy');
    await expect(cards.getByTestId('game-publisher').first()).toHaveText('GitHub Games');
  });

  test('Filters - clear button resets the filters', async ({ page }) => {
    const total = await page.getByTestId('game-card').count();
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    await page.getByTestId('filter-clear').click();
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(total);
    await expect(page.getByRole('checkbox', { name: 'Puzzle' })).not.toBeChecked();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Filters - shows an empty state when nothing matches', async ({ page }) => {
    // Every seeded category/publisher pair has games, so detach the cards from their categories to force no matches.
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('[data-testid="game-card"]').forEach((card) => {
        card.dataset.categoryId = '0';
      });
    });
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    await expect(page.getByTestId('filter-empty-state')).toBeVisible();
    await expect(page.getByTestId('filter-empty-state')).toContainText('No games match the selected filters.');
    await expect(page.getByTestId('games-grid')).toBeHidden();
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 0 of');
  });

  test('Filters - restores selection from the URL', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Puzzle' })).toBeChecked();
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(4);
  });

  test('Filters - controls are keyboard operable with visible focus', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: 'Action' });
    await checkbox.focus();
    await expect(checkbox).toBeFocused();
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(5);
  });
});
