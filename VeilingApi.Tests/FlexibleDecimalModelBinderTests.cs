using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Primitives;
using VeilingApi.ModelBinding;
using System.Globalization;
using Xunit;

namespace VeilingApi.Tests;

public class FlexibleDecimalModelBinderTests
{
    [Theory]
    [InlineData("0.59", 0.59)]
    [InlineData("0,59", 0.59)]
    [InlineData("1.234,56", 1234.56)]
    [InlineData("1,234.56", 1234.56)]
    [InlineData("59", 59)]
    public async Task BindModelAsync_ParsesVariousDecimalFormats(string raw, decimal expected)
    {
        var original = CultureInfo.CurrentCulture;
        var originalUi = CultureInfo.CurrentUICulture;

        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("nl-NL");
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("nl-NL");

            var binder = new FlexibleDecimalModelBinder();
            var ctx = CreateBindingContext("minimumPrijs", raw, typeof(decimal));

            await binder.BindModelAsync(ctx);

            Assert.True(ctx.Result.IsModelSet);
            Assert.Equal(expected, Assert.IsType<decimal>(ctx.Result.Model));
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
            CultureInfo.CurrentUICulture = originalUi;
        }
    }

    [Fact]
    public async Task BindModelAsync_AddsModelError_OnInvalid()
    {
        var binder = new FlexibleDecimalModelBinder();
        var ctx = CreateBindingContext("minimumPrijs", "niet-een-getal", typeof(decimal));

        await binder.BindModelAsync(ctx);

        Assert.False(ctx.Result.IsModelSet);
        Assert.True(ctx.ModelState.ContainsKey("minimumPrijs"));
        Assert.NotEmpty(ctx.ModelState["minimumPrijs"]!.Errors);
    }

    private static DefaultModelBindingContext CreateBindingContext(string name, string value, Type type)
    {
        var metadataProvider = new EmptyModelMetadataProvider();
        var metadata = metadataProvider.GetMetadataForType(type);

        var httpContext = new DefaultHttpContext();
        var actionContext = new ActionContext(httpContext, new(), new());

        var valueProvider = new SingleValueProvider(name, value);

        return new DefaultModelBindingContext
        {
            ActionContext = actionContext,
            ModelMetadata = metadata,
            ModelName = name,
            ValueProvider = valueProvider,
            ModelState = new ModelStateDictionary()
        };
    }

    private sealed class SingleValueProvider(string key, string value) : IValueProvider
    {
        public bool ContainsPrefix(string prefix) => string.Equals(prefix, key, StringComparison.Ordinal);

        public ValueProviderResult GetValue(string requestedKey)
        {
            if (!string.Equals(requestedKey, key, StringComparison.Ordinal))
            {
                return ValueProviderResult.None;
            }

            return new ValueProviderResult(new StringValues(value));
        }
    }
}
