// The database sends at most 1000 rows per request, whatever `.limit()` asks for. For lists that can be
// longer (every word in the Dictionary), read them a page at a time until a short page says it is the end.
// `page` should sort by something unique so no row is skipped or repeated between pages.
export async function readAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: string | null }> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}
