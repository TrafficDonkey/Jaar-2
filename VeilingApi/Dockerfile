# 1. Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

# 2. Build image
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["VeilingApi/VeilingApi.csproj", "VeilingApi/"]
RUN dotnet restore "VeilingApi/VeilingApi.csproj"

COPY . .
WORKDIR "/src/VeilingApi"

RUN dotnet publish "VeilingApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 3. Final image
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "VeilingApi.dll"]
