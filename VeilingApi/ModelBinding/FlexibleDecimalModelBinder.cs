using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.Globalization;

namespace VeilingApi.ModelBinding;

public sealed class FlexibleDecimalModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext is null) throw new ArgumentNullException(nameof(bindingContext));

        var valueProviderResult = bindingContext.ValueProvider.GetValue(bindingContext.ModelName);
        if (valueProviderResult == ValueProviderResult.None) return Task.CompletedTask;

        bindingContext.ModelState.SetModelValue(bindingContext.ModelName, valueProviderResult);

        var raw = valueProviderResult.FirstValue;
        if (string.IsNullOrWhiteSpace(raw))
        {
            if (bindingContext.ModelType == typeof(decimal?))
            {
                bindingContext.Result = ModelBindingResult.Success(null);
            }
            return Task.CompletedTask;
        }

        if (TryParseFlexible(raw, out var parsed))
        {
            bindingContext.Result = ModelBindingResult.Success(parsed);
            return Task.CompletedTask;
        }

        bindingContext.ModelState.TryAddModelError(bindingContext.ModelName, "Ongeldig getal.");
        return Task.CompletedTask;
    }

    private static bool TryParseFlexible(string input, out decimal value)
    {
        var trimmed = input.Trim();

        var normalized = NormalizeDecimalString(trimmed);
        if (normalized is not null &&
            decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        return decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.CurrentCulture, out value) ||
               decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    private static string? NormalizeDecimalString(string input)
    {
        var s = input.Trim();
        if (s.Length == 0) return null;

        var lastDot = s.LastIndexOf('.');
        var lastComma = s.LastIndexOf(',');
        var lastSep = Math.Max(lastDot, lastComma);
        if (lastSep < 0) return null;

        var digitsAfter = s.Length - lastSep - 1;
        if (digitsAfter <= 0 || digitsAfter > 2) return null;

        var decimalChar = s[lastSep];

        Span<char> buffer = stackalloc char[s.Length];
        var written = 0;
        for (var i = 0; i < s.Length; i++)
        {
            var ch = s[i];
            if (ch == ' ' || ch == '\u00A0') continue;

            if (ch == '.' || ch == ',')
            {
                if (ch == decimalChar) buffer[written++] = '.';
                continue;
            }

            buffer[written++] = ch;
        }

        var normalized = new string(buffer[..written]);
        return normalized.Length == 0 ? null : normalized;
    }
}
