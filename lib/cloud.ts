import type {SupabaseClient} from '@supabase/supabase-js';
import {validate, type Project} from './model';
export async function loadProjects(client:SupabaseClient):Promise<Project[]>{
  const {data:allowed,error:authError}=await client.rpc('is_admin');
  if(authError)throw new Error('无法验证管理员权限：'+authError.message);
  if(allowed!==true)throw new Error('当前账户不是指定管理员');
  const {data,error}=await client.from('projects').select('id,data').order('name');
  if(error)throw new Error('读取项目失败：'+error.message);
  return (data??[]).map(row=>{const p=row.data as Project;validate(p);if(row.id!==p.id)throw new Error('项目数据不一致');return p;});
}
export async function saveProject(client:SupabaseClient,p:Project){validate(p);const {error}=await client.rpc('save_project',{payload:p});if(error)throw new Error(error.message);}
export async function deleteProject(client:SupabaseClient,id:string){const {data,error}=await client.from('projects').delete().eq('id',id).select('id');if(error)throw new Error(error.message);if(data?.length!==1)throw new Error('删除未生效：项目不存在或没有权限');}
