using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace VeilingApi.Services;

public static class TwoFactorHelper
{
    private const int SecretSizeBytes = 20;
    private const int TotpDigits = 6;
    private const int TotpStepSeconds = 30;
    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(SecretSizeBytes);
        return Base32Encode(bytes);
    }

    public static string BuildOtpAuthUrl(string issuer, string account, string secret)
    {
        var safeIssuer = string.IsNullOrWhiteSpace(issuer) ? "FloraFlow" : issuer.Trim();
        var safeAccount = string.IsNullOrWhiteSpace(account) ? "account" : account.Trim();
        var label = Uri.EscapeDataString($"{safeIssuer}:{safeAccount}");
        var issuerParam = Uri.EscapeDataString(safeIssuer);
        return $"otpauth://totp/{label}?secret={secret}&issuer={issuerParam}&digits={TotpDigits}&period={TotpStepSeconds}";
    }

    public static bool ValidateCode(string secret, string code, int allowedSkew = 1)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(code))
            return false;

        var digits = new string(code.Where(char.IsDigit).ToArray());
        if (digits.Length != TotpDigits)
            return false;

        var key = Base32Decode(secret);
        if (key.Length == 0)
            return false;

        var unix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var counter = unix / TotpStepSeconds;

        for (var offset = -allowedSkew; offset <= allowedSkew; offset++)
        {
            if (ComputeTotp(key, counter + offset, TotpDigits) == digits)
                return true;
        }

        return false;
    }

    private static string ComputeTotp(byte[] key, long counter, int digits)
    {
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian)
            Array.Reverse(counterBytes);

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(counterBytes);

        var offset = hash[^1] & 0x0f;
        var binary =
            ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);

        var otp = binary % (int)Math.Pow(10, digits);
        return otp.ToString(new string('0', digits));
    }

    private static string Base32Encode(byte[] data)
    {
        if (data.Length == 0)
            return string.Empty;

        var output = new StringBuilder();
        var buffer = (int)data[0];
        var next = 1;
        var bitsLeft = 8;

        while (bitsLeft > 0 || next < data.Length)
        {
            if (bitsLeft < 5)
            {
                if (next < data.Length)
                {
                    buffer <<= 8;
                    buffer |= data[next++] & 0xff;
                    bitsLeft += 8;
                }
                else
                {
                    var pad = 5 - bitsLeft;
                    buffer <<= pad;
                    bitsLeft += pad;
                }
            }

            var index = 0x1f & (buffer >> (bitsLeft - 5));
            bitsLeft -= 5;
            output.Append(Base32Alphabet[index]);
        }

        return output.ToString();
    }

    private static byte[] Base32Decode(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return Array.Empty<byte>();

        var cleaned = input.Trim().Replace(" ", "").Replace("-", "").ToUpperInvariant();
        var output = new List<byte>();
        var buffer = 0;
        var bitsLeft = 0;

        foreach (var ch in cleaned)
        {
            var val = Base32Alphabet.IndexOf(ch);
            if (val < 0)
                continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;

            if (bitsLeft >= 8)
            {
                bitsLeft -= 8;
                output.Add((byte)((buffer >> bitsLeft) & 0xff));
            }
        }

        return output.ToArray();
    }
}
