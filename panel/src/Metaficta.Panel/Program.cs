using Metaficta.Panel;

try
{
    PanelApp.Run(args);
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    // Panel başlatılamadı: IIS'in anlamsız "500.30" sayfası yerine hatayı ve çözüm önerisini gösteren küçük bir uygulama çalıştır.
    StartupFailure.Run(args, ex);
}

public partial class Program;
