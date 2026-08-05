package com.amqstudio.security;

import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.io.InputStream;
import java.security.*;
import java.security.cert.Certificate;
import java.security.spec.MGF1ParameterSpec;
import java.util.Base64;

/**
 * RSA key pair utility for secure credential transport.
 * Supports two modes:
 *   1. In-memory generation (no keystore needed — keys regenerated on each restart)
 *   2. Persistent keystore (loads from a pre-generated PKCS12 file on classpath)
 * Only the public key is ever exposed; the private key has no accessor method.
 */
public class CryptoUtil {

    private static PrivateKey privateKey;
    private static PublicKey publicKey;
    private static boolean initialized = false;

    /**
     * Generates an RSA key pair in-memory. No keystore file or password required.
     * Keys are ephemeral — regenerated on each app restart (sessions are cleared anyway).
     */
    public static synchronized void init() {
        if (initialized) return;
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048, new SecureRandom());
            KeyPair keyPair = keyGen.generateKeyPair();
            privateKey = keyPair.getPrivate();
            publicKey = keyPair.getPublic();
            initialized = true;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate RSA key pair: " + e.getMessage(), e);
        }
    }

    /**
     * Loads the key pair from a PKCS12 keystore on the classpath.
     * Use this if you need persistent keys across restarts.
     */
    public static synchronized void init(String keystorePath, String keystorePassword, String alias) {
        if (initialized) return;
        try {
            char[] password = keystorePassword.toCharArray();
            KeyStore ks = KeyStore.getInstance("PKCS12");

            InputStream is = CryptoUtil.class.getClassLoader().getResourceAsStream(keystorePath);
            if (is == null) {
                throw new IllegalStateException(
                    "Keystore not found on classpath: " + keystorePath +
                    ". Generate it with: keytool -genkeypair -alias " + alias +
                    " -keyalg RSA -keysize 2048 -validity 3650 -storetype PKCS12 -keystore <path>");
            }
            ks.load(is, password);
            is.close();

            privateKey = (PrivateKey) ks.getKey(alias, password);
            Certificate cert = ks.getCertificate(alias);
            if (cert == null) {
                throw new IllegalStateException("No certificate found for alias: " + alias);
            }
            publicKey = cert.getPublicKey();
            initialized = true;
        } catch (IllegalStateException e) {
            throw new RuntimeException(e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load keystore: " + e.getMessage(), e);
        }
    }

    /**
     * Returns the RSA public key in Base64-encoded SPKI format (for Web Crypto API import).
     */
    public static String getPublicKey() {
        ensureInitialized();
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    /**
     * Decrypts a Base64-encoded RSA-OAEP ciphertext using the private key.
     */
    public static String decrypt(String encryptedBase64) throws Exception {
        ensureInitialized();
        byte[] encryptedBytes = Base64.getDecoder().decode(encryptedBase64);
        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPPadding");
        OAEPParameterSpec oaepParams = new OAEPParameterSpec(
            "SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT
        );
        cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParams);
        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
        return new String(decryptedBytes, "UTF-8");
    }

    private static void ensureInitialized() {
        if (!initialized) {
            throw new IllegalStateException("CryptoUtil not initialized. Call init() first.");
        }
    }
}
