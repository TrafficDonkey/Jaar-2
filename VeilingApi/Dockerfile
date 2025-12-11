# 1. Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

# Render default port = 10000
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

# 2. Build image
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Kopieer csproj en restore
COPY ["VeilingApi/VeilingApi.csproj", "VeilingApi/"]
RUN dotnet restore "VeilingApi/VeilingApi.csproj"

# Kopieer de rest van de solution
COPY . .
WORKDIR "/src/VeilingApi"

# Publish in Release
RUN dotnet publish "VeilingApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 3. Final image
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "VeilingApi.dll"]
