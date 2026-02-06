import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.screenBackground,
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoIcon: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: theme.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textMuted,
      marginTop: 8,
    },
    formContainer: {
      width: '100%',
      maxWidth: 400,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    inputContainerFocused: {
      borderColor: theme.accent,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 16,
      fontSize: 16,
      color: theme.text,
    },
    eyeButton: {
      padding: 4,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.error}15`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      color: theme.error,
      fontSize: 14,
      marginLeft: 8,
    },
    button: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.buttonText,
      fontSize: 18,
      fontWeight: '600',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    switchText: {
      color: theme.textMuted,
      fontSize: 15,
    },
    switchLink: {
      color: theme.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 16,
      marginTop: -8,
    },
    forgotPasswordText: {
      color: theme.accent,
      fontSize: 14,
    },
    skipButton: {
      marginTop: 32,
      padding: 12,
    },
    skipText: {
      color: theme.textMuted,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      color: theme.textMuted,
      fontSize: 14,
      paddingHorizontal: 16,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 12,
    },
    googleIcon: {
      width: 20,
      height: 20,
    },
    googleButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default function AuthScreen({ onSkip }) {
  const { theme } = useTheme();
  const { signIn, signUp, signInWithGoogle, loading, error, clearError, isConfigured } = useAuth();
  const styles = makeStyles(theme);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = useCallback(async () => {
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('Please enter a valid email');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setLocalError(error.message);
        } else {
          Alert.alert(
            'Check your email',
            'We sent you a confirmation link. Please verify your email to continue.',
            [{ text: 'OK' }]
          );
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setLocalError(error.message);
        }
      }
    } catch (err) {
      setLocalError(err.message);
    }
  }, [email, password, confirmPassword, isSignUp, signIn, signUp, clearError]);

  const toggleMode = useCallback(() => {
    setIsSignUp((prev) => !prev);
    setLocalError(null);
    clearError();
    setConfirmPassword('');
  }, [clearError]);

  const handleGoogleSignIn = useCallback(async () => {
    setLocalError(null);
    clearError();
    setGoogleLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setLocalError(error.message);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, clearError]);

  const displayError = localError || error;

  if (!isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.keyboardView}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="puzzle" size={40} color={theme.buttonText} />
            </View>
            <Text style={styles.title}>Puzzle</Text>
            <Text style={styles.subtitle}>Supabase not configured</Text>
          </View>
          
          <View style={[styles.errorContainer, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="information-circle" size={20} color={theme.accent} />
            <Text style={[styles.errorText, { color: theme.textMuted }]}>
              To enable cloud sync, add your Supabase credentials in src/config/supabase.js
            </Text>
          </View>

          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>Continue without account</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="puzzle" size={40} color={theme.buttonText} />
          </View>
          <Text style={styles.title}>Puzzle</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create an account' : 'Sign in to sync your memories'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {displayError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={theme.error} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          <View
            style={[
              styles.inputContainer,
              emailFocused && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={emailFocused ? theme.accent : theme.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              passwordFocused && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={passwordFocused ? theme.accent : theme.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <View
              style={[
                styles.inputContainer,
                confirmFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={confirmFocused ? theme.accent : theme.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={theme.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={theme.text} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.switchLink}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>Continue without account</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
