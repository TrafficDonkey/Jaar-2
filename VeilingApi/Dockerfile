# 1. Runtime image (.NET 9)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app

# Render default port = 10000
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

# 2. Build image (.NET 9 SDK)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# csproj kopiëren en restore doen
COPY ["VeilingApi/VeilingApi.csproj", "VeilingApi/"]
RUN dotnet restore "VeilingApi/VeilingApi.csproj"

# rest van de solution kopiëren
COPY . .
WORKDIR "/src/VeilingApi"

# Publish in Release
RUN dotnet publish "VeilingApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 3. Final image
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "VeilingApi.dll"]
