# Generated manually for adding prefijo_telefono field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0003_detallecompra_eliminado_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='proveedore',
            name='prefijo_telefono',
            field=models.CharField(
                default='+56',
                help_text='Prefijo del país (ej: +56, +1, +34)',
                max_length=10
            ),
        ),
    ] 