using Microsoft.AspNetCore.Identity;

namespace VeilingApi.Services
{
    public class PasswordService
    {
        private readonly PasswordHasher<string> _hasher = new();

        public string Hash(string plain)
            => _hasher.HashPassword("", plain);

        public bool Verify(string hash, string plain)
            => _hasher.VerifyHashedPassword("", hash, plain) is not PasswordVerificationResult.Failed;
    }
}
