export const haService = {
  sendHomeAssistantCommand: async (action, device) => {
    const webhookUrl = process.env.HA_WEBHOOK_URL;
    const token = process.env.HA_TOKEN;

    if (!webhookUrl || webhookUrl.includes('localhost')) {
      console.warn('⚠️ ATENÇÃO: HA_WEBHOOK_URL de produção não configurada adequadamente.');
    }

    try {
      // Isolamento Temporário do HA
      console.log(`[HA Webhook Pronto para Disparo] Payload:`, { action, device });

      /* 
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ action, device })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      */

      return { success: true };
    } catch (error) {
      console.error('Falha ao despachar para o Home Assistant:', error.message);
      return { success: false, error: error.message };
    }
  }
};
