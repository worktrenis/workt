import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Alert, PixelRatio } from 'react-native';

/**
 * Cattura la View puntata da ref e apre il dialogo di condivisione/salvataggio.
 * Per le ScrollView wrappa il contenuto interno (non la ScrollView stessa)
 * così si ottiene la pagina intera, non solo la parte visibile.
 */
export async function captureAndShare(ref) {
  try {
    const uri = await captureRef(ref, {
      format: 'jpg',
      quality: 1.0,
      result: 'tmpfile',
      pixelRatio: PixelRatio.get(),
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Salva o condividi screenshot',
        UTI: 'public.jpeg',
      });
    } else {
      Alert.alert('Condivisione non disponibile', 'Non è possibile condividere su questo dispositivo.');
    }
  } catch (err) {
    Alert.alert('Errore screenshot', err.message);
  }
}
