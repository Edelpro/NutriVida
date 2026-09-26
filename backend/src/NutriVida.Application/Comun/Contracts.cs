namespace NutriVida.Application.Common;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total)
{
    public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)PageSize));
}

public sealed record ProblemDetailsModel(string Title, string Detail, int Status, IReadOnlyDictionary<string, string[]>? Errors = null);
