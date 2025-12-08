# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0010_sucursal'),  # Migración que crea el modelo Sucursal
        ('usuario', '0003_usuario_es_dueño'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='sucursal',
            field=models.ForeignKey(blank=True, help_text='Sucursal donde trabaja el usuario', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='usuarios', to='home.sucursal'),
        ),
    ]
