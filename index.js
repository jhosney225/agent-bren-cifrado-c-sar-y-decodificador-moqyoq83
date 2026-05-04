
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

// Caesar cipher implementation
function caesarCipher(text, shift) {
  return text
    .split("")
    .map((char) => {
      if (/[a-z]/.test(char)) {
        return String.fromCharCode(
          ((char.charCodeAt(0) - 97 + shift) % 26) + 97
        );
      } else if (/[A-Z]/.test(char)) {
        return String.fromCharCode(
          ((char.charCodeAt(0) - 65 + shift) % 26) + 65
        );
      }
      return char;
    })
    .join("");
}

// Brute force Caesar cipher decoder with frequency analysis
function decodeCaesar(encryptedText) {
  const possibleDecodings = [];

  for (let shift = 0; shift < 26; shift++) {
    const decoded = caesarCipher(encryptedText, (26 - shift) % 26);
    possibleDecodings.push({
      shift: shift,
      text: decoded,
      score: calculateEnglishScore(decoded),
    });
  }

  return possibleDecodings.sort((a, b) => b.score - a.score);
}

// Calculate likelihood that text is English based on letter frequency
function calculateEnglishScore(text) {
  const englishFreq = {
    a: 0.082,
    b: 0.015,
    c: 0.028,
    d: 0.043,
    e: 0.127,
    f: 0.022,
    g: 0.02,
    h: 0.061,
    i: 0.07,
    j: 0.0015,
    k: 0.0077,
    l: 0.04,
    m: 0.024,
    n: 0.067,
    o: 0.075,
    p: 0.019,
    q: 0.001,
    r: 0.06,
    s: 0.063,
    t: 0.091,
    u: 0.028,
    v: 0.0098,
    w: 0.024,
    x: 0.0015,
    y: 0.02,
    z: 0.0074,
  };

  const freq = {};
  let totalLetters = 0;

  text.toLowerCase().split("").forEach((char) => {
    if (/[a-z]/.test(char)) {
      freq[char] = (freq[char] || 0) + 1;
      totalLetters++;
    }
  });

  let score = 0;
  for (const [char, count] of Object.entries(freq)) {
    const expected = englishFreq[char] || 0;
    const actual = count / totalLetters;
    score += Math.abs(actual - expected);
  }

  return 1 / (score + 0.1); // Inverse of deviation
}

async function chat(conversationHistory) {
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: `You are a helpful assistant specialized in Caesar cipher encryption and decryption.
You can help users:
1. Encrypt text using Caesar cipher with a specified shift
2. Decrypt Caesar cipher by analyzing patterns and providing the most likely decryption
3. Explain how Caesar cipher works
4. Provide information about cryptography

When encrypting, ask for the shift value (0-25).
When decrypting, use the provided decoded options and explain which one is likely correct.
Be conversational and helpful.`,
    messages: conversationHistory,
  });

  return response.content[0].text;
}

async function processUserInput(userInput, conversationHistory) {
  // Check for cipher operations in user input
  let contextInfo = "";

  if (
    userInput.toLowerCase().includes("encrypt") ||
    userInput.toLowerCase().includes("decode")
  ) {
    // Extract text and shift for encryption
    const encryptMatch = userInput.match(
      /encrypt\s+["']([^"']+)["']\s+(?:with\s+)?shift\s+(\d+)/i
    );
    if (encryptMatch) {
      const plainText = encryptMatch[1];
      const shift = parseInt(encryptMatch[2]);
      const encrypted = caesarCipher(plainText, shift);
      contextInfo = `\n\n[CIPHER OPERATION RESULT]\nEncrypted "${plainText}" with shift ${shift}: "${encrypted}"`;
    }
  }

  if (
    userInput.toLowerCase().includes("decrypt") ||
    userInput.toLowerCase().includes("crack")
  ) {
    // Extract encrypted text for decryption
    const decryptMatch = userInput.match(
      /decrypt\s+["']([^"']+)["']|crack\s+["']([^"']+)["']/i
    );
    if (decryptMatch) {
      const encryptedText = decryptMatch[1] || decryptMatch[2];
      const decodings = decodeCaesar(encryptedText);
      const topThree = decodings.slice(0, 3);
      contextInfo = `\n\n[DECRYPTION ANALYSIS]\nTop 3 possible decodings for "${encryptedText}":\n`;
      topThree.forEach((decoding, index) => {
        contextInfo += `${index + 1}. Shift ${decoding.shift}: "${decoding.text}" (confidence: ${(decoding.score * 100).toFixed(1)}%)\n`;
      });
    }
  }

  // Add context to user message for Claude
  const enhancedUserInput =
    userInput + (contextInfo ? contextInfo : "");

  // Add user message to history