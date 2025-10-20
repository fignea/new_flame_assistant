-- Script para poblar la base de datos con datos de demostración
-- Solo se ejecuta para el tenant 'flame'

-- ============================================
-- POBLAR SOLO SI ES EL TENANT FLAME
-- ============================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_admin_user_id UUID;
  v_contact1_id UUID;
  v_contact2_id UUID;
  v_contact3_id UUID;
  v_contact4_id UUID;
  v_contact5_id UUID;
  v_conv1_id UUID;
  v_conv2_id UUID;
  v_conv3_id UUID;
  v_assistant_id UUID;
BEGIN
  -- Obtener el ID del tenant 'flame'
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'flame' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No se encontró el tenant flame. El script solo funciona para la organización FLAME.';
    RETURN;
  END IF;

  RAISE NOTICE 'Poblando datos de demostración para tenant: %', v_tenant_id;

  -- Obtener el ID del usuario admin
  SELECT id INTO v_admin_user_id FROM users WHERE tenant_id = v_tenant_id AND role = 'owner' LIMIT 1;

  -- Obtener el ID del asistente
  SELECT id INTO v_assistant_id FROM assistants WHERE tenant_id = v_tenant_id LIMIT 1;

  -- ============================================
  -- CREAR USUARIOS ADICIONALES DE DEMO
  -- ============================================
  
  -- Solo crear si no existen
  IF NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = v_tenant_id AND email = 'agente1@flame.com') THEN
    INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
    VALUES (
      v_tenant_id,
      'agente1@flame.com',
      '$2a$10$I0OxCUtctlX2g1KR5kHjF.JXA3ub/BMiq7QVtoyaMV42NOTVai5ZC', -- flame123
      'Carlos Agente',
      'agent',
      true
    );
    RAISE NOTICE '✅ Usuario agente1@flame.com creado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = v_tenant_id AND email = 'agente2@flame.com') THEN
    INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
    VALUES (
      v_tenant_id,
      'agente2@flame.com',
      '$2a$10$I0OxCUtctlX2g1KR5kHjF.JXA3ub/BMiq7QVtoyaMV42NOTVai5ZC', -- flame123
      'Ana López',
      'agent',
      true
    );
    RAISE NOTICE '✅ Usuario agente2@flame.com creado';
  END IF;

  -- ============================================
  -- CREAR CONTACTOS DE DEMO
  -- ============================================
  
  -- Contacto 1
  INSERT INTO contacts (tenant_id, external_id, platform, name, phone, email, is_blocked)
  VALUES (
    v_tenant_id,
    '5491112345001',
    'whatsapp',
    'Roberto Martínez',
    '+5491112345001',
    'roberto@cliente.com',
    false
  )
  ON CONFLICT (tenant_id, platform, external_id) DO NOTHING
  RETURNING id INTO v_contact1_id;
  
  IF v_contact1_id IS NULL THEN
    SELECT id INTO v_contact1_id FROM contacts WHERE tenant_id = v_tenant_id AND external_id = '5491112345001';
  END IF;

  -- Contacto 2
  INSERT INTO contacts (tenant_id, external_id, platform, name, phone, email, is_blocked)
  VALUES (
    v_tenant_id,
    '5491112345002',
    'whatsapp',
    'Laura González',
    '+5491112345002',
    'laura@empresa.com',
    false
  )
  ON CONFLICT (tenant_id, platform, external_id) DO NOTHING
  RETURNING id INTO v_contact2_id;
  
  IF v_contact2_id IS NULL THEN
    SELECT id INTO v_contact2_id FROM contacts WHERE tenant_id = v_tenant_id AND external_id = '5491112345002';
  END IF;

  -- Contacto 3
  INSERT INTO contacts (tenant_id, external_id, platform, name, phone, email, is_blocked)
  VALUES (
    v_tenant_id,
    '5491112345003',
    'whatsapp',
    'Diego Fernández',
    '+5491112345003',
    'diego@startup.com',
    false
  )
  ON CONFLICT (tenant_id, platform, external_id) DO NOTHING
  RETURNING id INTO v_contact3_id;
  
  IF v_contact3_id IS NULL THEN
    SELECT id INTO v_contact3_id FROM contacts WHERE tenant_id = v_tenant_id AND external_id = '5491112345003';
  END IF;

  -- Contacto 4
  INSERT INTO contacts (tenant_id, external_id, platform, name, phone, email, is_blocked)
  VALUES (
    v_tenant_id,
    '5491112345004',
    'whatsapp',
    'María Rodríguez',
    '+5491112345004',
    'maria@tech.com',
    false
  )
  ON CONFLICT (tenant_id, platform, external_id) DO NOTHING
  RETURNING id INTO v_contact4_id;
  
  IF v_contact4_id IS NULL THEN
    SELECT id INTO v_contact4_id FROM contacts WHERE tenant_id = v_tenant_id AND external_id = '5491112345004';
  END IF;

  -- Contacto 5
  INSERT INTO contacts (tenant_id, external_id, platform, name, phone, email, is_blocked)
  VALUES (
    v_tenant_id,
    '5491112345005',
    'whatsapp',
    'José Hernández',
    '+5491112345005',
    'jose@consultor.com',
    false
  )
  ON CONFLICT (tenant_id, platform, external_id) DO NOTHING
  RETURNING id INTO v_contact5_id;
  
  IF v_contact5_id IS NULL THEN
    SELECT id INTO v_contact5_id FROM contacts WHERE tenant_id = v_tenant_id AND external_id = '5491112345005';
  END IF;

  RAISE NOTICE '✅ Contactos de demo creados';

  -- ============================================
  -- CREAR CONVERSACIONES DE DEMO
  -- ============================================
  
  -- Conversación 1
  INSERT INTO conversations (
    tenant_id, contact_id, platform, external_conversation_id, 
    status, title, last_message_at, assigned_to
  )
  VALUES (
    v_tenant_id,
    v_contact1_id,
    'whatsapp',
    'conv_demo_001',
    'active',
    'Consulta sobre productos',
    NOW() - INTERVAL '2 hours',
    v_admin_user_id
  )
  ON CONFLICT (tenant_id, platform, external_conversation_id) DO NOTHING
  RETURNING id INTO v_conv1_id;
  
  IF v_conv1_id IS NULL THEN
    SELECT id INTO v_conv1_id FROM conversations 
    WHERE tenant_id = v_tenant_id AND external_conversation_id = 'conv_demo_001';
  END IF;

  -- Conversación 2
  INSERT INTO conversations (
    tenant_id, contact_id, platform, external_conversation_id,
    status, title, last_message_at
  )
  VALUES (
    v_tenant_id,
    v_contact2_id,
    'whatsapp',
    'conv_demo_002',
    'active',
    'Soporte técnico',
    NOW() - INTERVAL '1 hour'
  )
  ON CONFLICT (tenant_id, platform, external_conversation_id) DO NOTHING
  RETURNING id INTO v_conv2_id;
  
  IF v_conv2_id IS NULL THEN
    SELECT id INTO v_conv2_id FROM conversations 
    WHERE tenant_id = v_tenant_id AND external_conversation_id = 'conv_demo_002';
  END IF;

  -- Conversación 3
  INSERT INTO conversations (
    tenant_id, contact_id, platform, external_conversation_id,
    status, title, last_message_at, priority
  )
  VALUES (
    v_tenant_id,
    v_contact3_id,
    'whatsapp',
    'conv_demo_003',
    'active',
    'Consulta urgente',
    NOW() - INTERVAL '30 minutes',
    'high'
  )
  ON CONFLICT (tenant_id, platform, external_conversation_id) DO NOTHING
  RETURNING id INTO v_conv3_id;
  
  IF v_conv3_id IS NULL THEN
    SELECT id INTO v_conv3_id FROM conversations 
    WHERE tenant_id = v_tenant_id AND external_conversation_id = 'conv_demo_003';
  END IF;

  RAISE NOTICE '✅ Conversaciones de demo creadas';

  -- ============================================
  -- CREAR MENSAJES DE DEMO
  -- ============================================
  
  IF v_conv1_id IS NOT NULL THEN
    -- Mensajes de conversación 1
    INSERT INTO messages (tenant_id, conversation_id, sender_id, sender_type, content, message_type, external_message_id)
    VALUES 
      (v_tenant_id, v_conv1_id, v_contact1_id, 'contact', 'Hola, quisiera información sobre sus productos', 'text', 'demo_msg_001'),
      (v_tenant_id, v_conv1_id, v_admin_user_id, 'agent', '¡Hola Roberto! Con gusto te ayudo. ¿Qué producto te interesa?', 'text', 'demo_msg_002'),
      (v_tenant_id, v_conv1_id, v_contact1_id, 'contact', 'Me interesan los planes premium', 'text', 'demo_msg_003')
    ON CONFLICT (tenant_id, external_message_id) DO NOTHING;
  END IF;

  IF v_conv2_id IS NOT NULL THEN
    -- Mensajes de conversación 2
    INSERT INTO messages (tenant_id, conversation_id, sender_id, sender_type, content, message_type, external_message_id)
    VALUES 
      (v_tenant_id, v_conv2_id, v_contact2_id, 'contact', 'Tengo un problema con mi cuenta', 'text', 'demo_msg_004'),
      (v_tenant_id, v_conv2_id, v_admin_user_id, 'agent', 'Hola Laura, ¿qué problema estás teniendo?', 'text', 'demo_msg_005')
    ON CONFLICT (tenant_id, external_message_id) DO NOTHING;
  END IF;

  IF v_conv3_id IS NOT NULL THEN
    -- Mensajes de conversación 3
    INSERT INTO messages (tenant_id, conversation_id, sender_id, sender_type, content, message_type, external_message_id)
    VALUES 
      (v_tenant_id, v_conv3_id, v_contact3_id, 'contact', 'URGENTE: Necesito ayuda inmediata', 'text', 'demo_msg_006'),
      (v_tenant_id, v_conv3_id, v_admin_user_id, 'agent', 'Hola Diego, estoy aquí para ayudarte. ¿Qué necesitas?', 'text', 'demo_msg_007')
    ON CONFLICT (tenant_id, external_message_id) DO NOTHING;
  END IF;

  RAISE NOTICE '✅ Mensajes de demo creados';

  -- ============================================
  -- CREAR MENSAJES PROGRAMADOS DE DEMO
  -- ============================================
  
  IF v_conv1_id IS NOT NULL THEN
    INSERT INTO scheduled_messages (
      tenant_id, conversation_id, content, message_type, 
      scheduled_at, status, created_by
    )
    VALUES (
      v_tenant_id,
      v_conv1_id,
      'Recordatorio: Tenemos una promoción especial esta semana',
      'text',
      NOW() + INTERVAL '1 day',
      'pending',
      v_admin_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_conv2_id IS NOT NULL THEN
    INSERT INTO scheduled_messages (
      tenant_id, conversation_id, content, message_type,
      scheduled_at, status, created_by
    )
    VALUES (
      v_tenant_id,
      v_conv2_id,
      'Seguimiento: ¿Se resolvió tu problema?',
      'text',
      NOW() + INTERVAL '2 days',
      'pending',
      v_admin_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '✅ Mensajes programados de demo creados';

  -- ============================================
  -- ACTUALIZAR CONTADORES DE INTERACCIÓN
  -- ============================================
  
  UPDATE contacts 
  SET 
    interaction_count = 3,
    last_interaction_at = NOW() - INTERVAL '30 minutes'
  WHERE id IN (v_contact1_id, v_contact2_id, v_contact3_id);

  UPDATE contacts 
  SET 
    interaction_count = 1,
    last_interaction_at = NOW() - INTERVAL '1 day'
  WHERE id IN (v_contact4_id, v_contact5_id);

  -- ============================================
  -- REFRESCAR VISTAS MATERIALIZADAS
  -- ============================================
  
  REFRESH MATERIALIZED VIEW dashboard_stats;
  REFRESH MATERIALIZED VIEW assistant_metrics;

  RAISE NOTICE '✅ Vistas materializadas actualizadas';
  RAISE NOTICE '🎉 Datos de demostración poblados exitosamente para tenant flame';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '   - Contactos: 5';
  RAISE NOTICE '   - Conversaciones: 3';
  RAISE NOTICE '   - Mensajes: ~10';
  RAISE NOTICE '   - Mensajes programados: 2';

END $$;

