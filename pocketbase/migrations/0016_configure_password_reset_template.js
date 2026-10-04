migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Redireciona o link de redefinição de senha para a rota do aplicativo /redefinir-senha?token={TOKEN}
    users.resetPasswordTemplate = {
      subject: 'Redefinição de senha - {APP_NAME}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0f172a; margin-bottom: 6px;">{APP_NAME}</h2>
    <p style="color: #64748b; font-size: 14px; margin: 0;">Recuperação de Acesso</p>
  </div>
  <p style="font-size: 15px; line-height: 1.6;">Olá,</p>
  <p style="font-size: 15px; line-height: 1.6;">Recebemos um pedido para criar uma nova senha para a sua conta no <strong>{APP_NAME}</strong>.</p>
  <p style="font-size: 15px; line-height: 1.6;">Para cadastrar sua nova senha com segurança, clique no botão abaixo:</p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="{APP_URL}/redefinir-senha?token={TOKEN}" style="background-color: #f59e0b; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block; font-size: 15px;">Redefinir Minha Senha</a>
  </div>
  <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Se o botão não funcionar, copie e cole o link a seguir no seu navegador:<br/>
  <a href="{APP_URL}/redefinir-senha?token={TOKEN}" style="color: #d97706; word-break: break-all;">{APP_URL}/redefinir-senha?token={TOKEN}</a></p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">Se você não solicitou a troca de senha, fique tranquilo: nenhuma alteração foi feita e você pode desconsiderar este e-mail com segurança.</p>
</div>`,
      actionUrl: '{APP_URL}/redefinir-senha?token={TOKEN}',
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.resetPasswordTemplate = {
      subject: 'Reset your {APP_NAME} password',
      body: `<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a>\n</p>\n<p><i>If you didn't ask to reset your password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>`,
      actionUrl: '{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}',
    }
    app.save(users)
  },
)
