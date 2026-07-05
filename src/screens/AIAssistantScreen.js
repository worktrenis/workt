import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AIAssistantService from '../services/AIAssistantService';

const { width } = Dimensions.get('window');

const AIAssistantScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const flatListRef = useRef(null);
  
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: '🤖 **Ciao! Sono l\'assistente WorkT.**\n\nPosso aiutarti con:\n\n💰 **CCNL e tariffe**\n  "Quanto prendo di straordinario?"\n  "Come funziona la reperibilità?"\n\n📊 **I tuoi dati**\n  "Quanto ho guadagnato?"\n  "Riepilogo del mese"\n\n📖 **Guida all\'app**\n  "Come inserisco un orario?"\n  "Come faccio il backup?"',
      isUser: false,
      isTyping: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const typingAnimRef = useRef(null);

  // Typing dots animation loop
  useEffect(() => {
    if (isLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      typingAnimRef.current = animation;
    } else {
      if (typingAnimRef.current) {
        typingAnimRef.current.stop();
        typingAnimRef.current = null;
      }
      typingAnim.setValue(0);
    }

    return () => {
      if (typingAnimRef.current) {
        typingAnimRef.current.stop();
      }
    };
  }, [isLoading, typingAnim]);

  const handleSend = async (text) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isLoading) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
      isTyping: false,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Aggiungi messaggio "sto scrivendo..."
    const typingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: typingId,
      text: '',
      isUser: false,
      isTyping: true,
    }]);
    
    try {
      // Usa il servizio con cache invece di ricaricare ogni volta
      const context = await AIAssistantService.loadContext();
      const response = await AIAssistantService.ask(messageText, context);
      
      // Sostituisci il messaggio di typing con la risposta
      setMessages(prev => prev.map(msg => 
        msg.id === typingId 
          ? { id: msg.id, text: response.text, isUser: false, isTyping: false }
          : msg
      ));
      
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Errore AI Assistant:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === typingId 
          ? { id: msg.id, text: '❌ Si è verificato un errore. Riprova.', isUser: false, isTyping: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    handleSend(suggestion);
  };

  const handleClearChat = () => {
    Alert.alert(
      'Cancella chat',
      'Vuoi cancellare tutta la conversazione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: () => {
            setMessages([{
              id: 'welcome',
              text: '🤖 **Ciao! Sono l\'assistente WorkT.**\n\nPosso aiutarti con:\n\n💰 **CCNL e tariffe**\n  "Quanto prendo di straordinario?"\n  "Come funziona la reperibilità?"\n\n📊 **I tuoi dati**\n  "Quanto ho guadagnato?"\n  "Riepilogo del mese"\n\n📖 **Guida all\'app**\n  "Come inserisco un orario?"\n  "Come faccio il backup?"',
              isUser: false,
              isTyping: false,
            }]);
            setSuggestions([]);
          },
        },
      ]
    );
  };

  // Formatta il testo con markdown avanzato (**grassetto**, liste, citazioni)
  const renderFormattedText = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      // Linea vuota
      if (!line.trim()) {
        return <View key={lineIndex} style={styles.emptyLine} />;
      }

      const elements = [];

      // Gestione citazioni (linee che iniziano con ℹ️, ⚠️, 💡, 🔒)
      const quoteMatch = line.match(/^([ℹ️⚠️💡🔒✅❌])\s*(.+)/);
      if (quoteMatch) {
        elements.push(
          <View key={lineIndex} style={styles.quoteContainer}>
            <Text style={styles.quoteIcon}>{quoteMatch[1]}</Text>
            <Text style={styles.quoteText}>
              <FormattedBold text={quoteMatch[2]} />
            </Text>
          </View>
        );
        return <React.Fragment key={lineIndex}>{elements}</React.Fragment>;
      }

      // Gestione titoli (linee che iniziano con **)
      const titleMatch = line.match(/^\*\*(.+)\*\*$/);
      if (titleMatch) {
        elements.push(
          <Text key={lineIndex} style={styles.titleText}>{titleMatch[1]}</Text>
        );
        return <React.Fragment key={lineIndex}>{elements}</React.Fragment>;
      }

      // Gestione liste (linee che iniziano con • o -)
      const listMatch = line.match(/^[•\-]\s*(.+)/);
      if (listMatch) {
        elements.push(
          <View key={lineIndex} style={styles.listItem}>
            <Text style={styles.listBullet}>•</Text>
            <Text style={styles.messageText}>
              <FormattedBold text={listMatch[1]} />
            </Text>
          </View>
        );
        return <React.Fragment key={lineIndex}>{elements}</React.Fragment>;
      }

      // Gestione numeri di lista (1., 2., ecc.)
      const numberedMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        elements.push(
          <View key={lineIndex} style={styles.listItem}>
            <Text style={styles.numberedBullet}>{numberedMatch[1]}.</Text>
            <Text style={styles.messageText}>
              <FormattedBold text={numberedMatch[2]} />
            </Text>
          </View>
        );
        return <React.Fragment key={lineIndex}>{elements}</React.Fragment>;
      }

      // Testo normale con grassetto
      elements.push(
        <Text key={lineIndex} style={styles.messageText}>
          <FormattedBold text={line} />
        </Text>
      );
      return <React.Fragment key={lineIndex}>{elements}</React.Fragment>;
    });
  };

  // Componente per formattare il grassetto all'interno di un testo
  const FormattedBold = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={index} style={styles.boldText}>{part.slice(2, -2)}</Text>;
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderTypingDots = () => {
    const dot1Opacity = typingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    });
    const dot2Opacity = typingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 0.3, 1],
    });
    const dot3Opacity = typingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.5, 0.3],
    });

    return (
      <View style={styles.typingContainer}>
        <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    if (item.isTyping) {
      return (
        <View style={[styles.messageBubble, styles.botBubble]}>
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.botMessageContent}>
            {renderTypingDots()}
          </View>
        </View>
      );
    }
    
    return (
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble,
      ]}>
        {!item.isUser && (
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot" size={20} color={theme.colors.primary} />
          </View>
        )}
        <View style={item.isUser ? styles.userMessageContent : styles.botMessageContent}>
          {renderFormattedText(item.text)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="robot" size={24} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>Assistente</Text>
        </View>
        <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Messaggi */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          suggestions.length > 0 && !isLoading ? (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Potresti chiedermi anche:</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestion(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Scrivi una domanda..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline={false}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() && !isLoading ? '#fff' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  clearButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.name === 'dark' ? `${theme.colors.primary}33` : `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  userMessageContent: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  botMessageContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  boldText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 22,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    lineHeight: 24,
    marginTop: 4,
    marginBottom: 2,
  },
  emptyLine: {
    height: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
    paddingLeft: 4,
  },
  listBullet: {
    fontSize: 15,
    color: theme.colors.primary,
    lineHeight: 22,
    marginRight: 6,
    fontWeight: 'bold',
  },
  numberedBullet: {
    fontSize: 15,
    color: theme.colors.primary,
    lineHeight: 22,
    marginRight: 6,
    fontWeight: 'bold',
    minWidth: 20,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  quoteIcon: {
    fontSize: 14,
    marginRight: 6,
    lineHeight: 20,
  },
  quoteText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 5,
  },
  typingDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: theme.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface,
  },
  suggestionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  suggestionChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  suggestionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

export default AIAssistantScreen;