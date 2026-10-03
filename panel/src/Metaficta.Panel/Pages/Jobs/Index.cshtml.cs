using Metaficta.Panel.Data;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Pages.Jobs;

public class IndexModel(PanelDbContext db) : PageModel
{
    public List<Job> Jobs { get; private set; } = [];

    public async Task OnGetAsync() => Jobs = await db.Jobs.OrderByDescending(j => j.Id).Take(200).ToListAsync();
}
