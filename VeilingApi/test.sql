USE [VeilingDb];
SELECT GebruikerId, Naam, Email, Rol, LEFT(WachtwoordHash, 10) AS HashPreview
FROM Gebruikers;

