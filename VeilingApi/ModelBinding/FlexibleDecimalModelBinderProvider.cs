using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;

namespace VeilingApi.ModelBinding;

public sealed class FlexibleDecimalModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context is null) throw new ArgumentNullException(nameof(context));

        var modelType = context.Metadata.ModelType;
        if (modelType != typeof(decimal) && modelType != typeof(decimal?)) return null;

        return new BinderTypeModelBinder(typeof(FlexibleDecimalModelBinder));
    }
}

