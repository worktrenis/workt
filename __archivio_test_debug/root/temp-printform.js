  // 📄 Funzione per creare PDF del form
  const printForm = async () => {
    try {
      console.log('📄 FORM PDF - Avvio creazione PDF...');
      
      Alert.alert(
        '📄 PDF Form',
        'Vuoi creare un PDF dell\'inserimento corrente?',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Crea PDF',
            onPress: async () => {
              try {
                // Crea HTML che simula il form
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <title>Inserimento Lavoro - ${form.date}</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background-color: #f5f5f5;
                      }
                      .form-container {
                        background-color: white;
                        border-radius: 10px;
                        padding: 20px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                      }
                      .header {
                        text-align: center;
                        border-bottom: 2px solid #007AFF;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                      }
                      .header h1 {
                        color: #007AFF;
                        margin: 0;
                        font-size: 24px;
                      }
                      .section {
                        margin-bottom: 20px;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                      }
                      .section-title {
                        color: #007AFF;
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #007AFF;
                        padding-bottom: 5px;
                      }
                      .field-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                      }
                      .field-label {
                        font-weight: bold;
                        color: #333;
                      }
                      .field-value {
                        color: #666;
                      }
                      .switch-field {
                        display: flex;
                        align-items: center;
                        margin-bottom: 8px;
                      }
                      .switch-label {
                        font-weight: bold;
                        margin-right: 10px;
                      }
                      .switch-value {
                        color: white;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                      }
                      .active { background-color: #4CAF50; }
                      .inactive { background-color: #f44336; }
                      .note-section {
                        background-color: #f9f9f9;
                        border-left: 4px solid #007AFF;
                        padding: 10px;
                        margin-top: 15px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="form-container">
                      <div class="header">
                        <h1>Inserimento Lavoro</h1>
                        <p>Data: ${form.date}</p>
                      </div>

                      <div class="section">
                        <div class="section-title">Informazioni Generali</div>
                        <div class="field-row">
                          <span class="field-label">Nome Cantiere:</span>
                          <span class="field-value">${form.site_name || 'Non specificato'}</span>
                        </div>
                        <div class="field-row">
                          <span class="field-label">Veicolo:</span>
                          <span class="field-value">${form.veicolo === 'andata_ritorno' ? 'Andata e Ritorno' : form.veicolo}</span>
                        </div>
                        <div class="field-row">
                          <span class="field-label">Targa/Numero:</span>
                          <span class="field-value">${form.targa_veicolo || 'Non specificato'}</span>
                        </div>
                      </div>

                      <div class="section">
                        <div class="section-title">Orari di Lavoro</div>
                        <div class="field-row">
                          <span class="field-label">Lavoro Ordinario:</span>
                          <span class="field-value">${form.viaggi[0]?.work_start_1 || '--:--'} - ${form.viaggi[0]?.work_end_1 || '--:--'}</span>
                        </div>
                        <div class="field-row">
                          <span class="field-label">Lavoro Straordinario:</span>
                          <span class="field-value">${form.viaggi[0]?.work_start_2 || '--:--'} - ${form.viaggi[0]?.work_end_2 || '--:--'}</span>
                        </div>
                      </div>

                      <div class="section">
                        <div class="section-title">Viaggio</div>
                        <div class="field-row">
                          <span class="field-label">Partenza Azienda:</span>
                          <span class="field-value">${form.viaggi[0]?.departure_company || '--:--'}</span>
                        </div>
                        <div class="field-row">
                          <span class="field-label">Arrivo Cantiere:</span>
                          <span class="field-value">${form.viaggi[0]?.arrival_site || '--:--'}</span>
                        </div>
                        <div class="field-row">
                          <span class="field-label">Partenza Ritorno:</span>
                          <span class="field-value">${form.viaggi[0]?.departure_return || '--:--'}</span>
                        </div>
                        <div class="field-row">
                          <span class="field-label">Arrivo Azienda:</span>
                          <span class="field-value">${form.viaggi[0]?.arrival_company || '--:--'}</span>
                        </div>
                      </div>

                      <div class="section">
                        <div class="section-title">Indennita</div>
                        <div class="switch-field">
                          <span class="switch-label">Trasferta:</span>
                          <span class="switch-value ${form.trasferta ? 'active' : 'inactive'}">${form.trasferta ? 'ATTIVA' : 'NON ATTIVA'}</span>
                        </div>
                        <div class="switch-field">
                          <span class="switch-label">Pasti:</span>
                          <span class="switch-value ${form.pasti ? 'active' : 'inactive'}">${form.pasti ? 'ATTIVA' : 'NON ATTIVA'}</span>
                        </div>
                        <div class="switch-field">
                          <span class="switch-label">Standby:</span>
                          <span class="switch-value ${form.standby ? 'active' : 'inactive'}">${form.standby ? 'ATTIVA' : 'NON ATTIVA'}</span>
                        </div>
                        ${form.standby ? `
                        <div class="field-row">
                          <span class="field-label">Orari Standby:</span>
                          <span class="field-value">${form.standby_start || '--:--'} - ${form.standby_end || '--:--'}</span>
                        </div>` : ''}
                      </div>

                      ${form.note_libere ? `
                      <div class="note-section">
                        <div class="section-title">Note</div>
                        <p>${form.note_libere}</p>
                      </div>` : ''}

                      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
                        <p>Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `;

                // Genera PDF
                const { uri } = await Print.printToFileAsync({
                  html: htmlContent,
                  base64: false
                });

                console.log('📄 PDF creato:', uri);

                // Condividi il PDF
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Condividi PDF Inserimento',
                  });
                  
                  Alert.alert(
                    'PDF Creato',
                    'Il PDF dell\'inserimento e stato creato e condiviso con successo!',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Condivisione Non Disponibile',
                    'Impossibile condividere il PDF su questo dispositivo.',
                    [{ text: 'OK' }]
                  );
                }
                
              } catch (error) {
                console.error('FORM PDF - Errore creazione:', error);
                Alert.alert(
                  'Errore PDF',
                  `Impossibile creare il PDF: ${error.message}`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('FORM PDF - Errore:', error);
      Alert.alert('Errore', 'Impossibile avviare la creazione PDF');
    }
  };
