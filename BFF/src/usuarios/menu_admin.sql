DO $$
DECLARE
    v_seguridad UUID;
BEGIN
    SELECT id_menu INTO v_seguridad
    FROM menu
    WHERE id_rol = '4b75d877-f8fa-4f4b-826c-68cf191724cd'
      AND nombre = 'Seguridad'
      AND id_menu_padre IS NULL
    LIMIT 1;

    IF v_seguridad IS NULL THEN
        INSERT INTO menu (id_rol, nombre, ruta, id_menu_padre, orden, activo)
        VALUES ('4b75d877-f8fa-4f4b-826c-68cf191724cd', 'Seguridad', NULL, NULL, 2, TRUE)
        RETURNING id_menu INTO v_seguridad;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM menu
        WHERE id_rol = '4b75d877-f8fa-4f4b-826c-68cf191724cd'
          AND ruta = '/seguridad/usuarios'
    ) THEN
        INSERT INTO menu (id_rol, nombre, ruta, id_menu_padre, orden, activo)
        VALUES ('4b75d877-f8fa-4f4b-826c-68cf191724cd', 'Usuarios', '/seguridad/usuarios', v_seguridad, 1, TRUE);
    END IF;
END;
$$;
